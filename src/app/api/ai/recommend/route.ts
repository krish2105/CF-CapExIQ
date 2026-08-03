import { NextResponse } from 'next/server';
import { createModelClient } from '@/lib/ai/client';
import { AI_MAX_TOKENS } from '@/lib/ai/limits';
import { aiGenerated, aiFallback } from '@/lib/ai/response';
import { parseModelContext } from '@/lib/ai/schemas';
import { parseModelOutput, RecommendSchema } from '@/lib/ai/schemas';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { StructedAIResponse } from '@/lib/types/finance';

const DEFAULT_FALLBACK_RECOMMEND: StructedAIResponse = {
  decision: 'Approve',
  executiveSummary: 'Projected net present value of AED 12.08M and an IRR of 26.3% support capital allocation for NovaRetail GCC automated micro-fulfilment centre in Dubai South.',
  keyValueDrivers: [
    'Year 1 Labor & Process Operating Cost Savings: AED 7.5M (grows at 4% p.a.)',
    'Incremental 30-min Delivery SLA Contribution Margin: AED 2.5M (grows at 5% p.a.)',
    'Low Corporate Tax Impact: UAE 9% headline rate preserves AED 7.4M Year-1 OCF',
  ],
  principalRisks: [
    'Robotics System Integration Delay: Prolongs ramp-up and defers Year-1 benefits',
    'DEWA Electricity & Cloud WCS SLA Escalation: Additional OpEx cost inflation exceeding 3%',
  ],
  managementControls: [
    'Enforce milestone-gated capital release linked to WMS/WCS integration sign-offs',
    'Mandate 15% maximum capex overrun penalty clause in vendor equipment contracts',
  ],
  confidence: 'High',
  disclaimer: 'AI-generated explanations and recommendations are advisory. All assumptions, calculations and final investment decisions must be reviewed and approved by a qualified human decision-maker.',
};

export async function POST(req: Request) {
  // Outside the try: the catch below returns a fallback recommendation, so a
  // refusal raised inside it would be swallowed and served as a 200.
  const auth = await requirePermission('ai.advisory');
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('recommend', auth.session);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { assumptions, metrics } = parseModelContext(body);

    // `decisionStatus` arrives from the client and was assigned straight into
    // this union. `body` was `any`, so nothing checked it, and an arbitrary
    // string reached a field the UI branches on. Typing the request surfaced
    // it; this narrows to the values the contract actually allows.
    const DECISIONS = [
      'Approve',
      'Phased Implementation',
      'Delay Pending Evidence',
      'Reject',
    ] as const;
    const claimed = metrics?.decisionStatus;
    const decision = (DECISIONS as readonly string[]).includes(claimed ?? '')
      ? (claimed as StructedAIResponse['decision'])
      : 'Approve';

    const fallbackResponse: StructedAIResponse = {
      ...DEFAULT_FALLBACK_RECOMMEND,
      decision,
      executiveSummary: `Projected net present value of AED ${metrics?.npv ? (metrics.npv / 1000000).toFixed(2) + 'M' : '12.08M'} and an IRR of ${metrics?.irr ? (metrics.irr * 100).toFixed(1) + '%' : '26.3%'} support capital allocation for NovaRetail GCC's automated micro-fulfilment centre.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return aiFallback(fallbackResponse, 'provider-unconfigured');
    }

    const openai = createModelClient(apiKey);

    const systemPrompt = `You are a Chief Financial Officer Adviser for NovaRetail GCC evaluating an automated micro-fulfilment centre.
Return your response ONLY as a JSON object matching this schema:
{
  "decision": "Approve" | "Phased Implementation" | "Delay Pending Evidence" | "Reject",
  "executiveSummary": string,
  "keyValueDrivers": string[],
  "principalRisks": string[],
  "managementControls": string[],
  "confidence": "High" | "Medium" | "Low",
  "disclaimer": string
}`;

    const userPrompt = `Financial Model Context:
- Net Present Value: AED ${metrics?.npv ?? 0}
- Internal Rate of Return: ${((metrics?.irr ?? 0) * 100).toFixed(2)}%
- Modified IRR: ${((metrics?.mirr ?? 0) * 100).toFixed(2)}%
- Profitability Index: ${metrics?.profitabilityIndex?.toFixed(2) ?? '1.0'}x
- Payback Period: ${metrics?.paybackPeriodYears?.toFixed(1) ?? 'N/A'} years
- WACC Hurdle Rate: ${((assumptions?.discountRate ?? 0.115) * 100).toFixed(1)}%

Formulate an executive board recommendation.`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: AI_MAX_TOKENS,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const outcome = parseModelOutput(RecommendSchema, content);
      if (!outcome.ok) {
        // Logged with the reason: "the model omitted voteCount.reject" and
        // "the provider is down" are different problems that used to produce
        // identical output.
        console.warn('recommend: rejected completion - ' + outcome.issue);
        return aiFallback(fallbackResponse, 'parse-failed');
      }
      const parsed = outcome.data;
      return aiGenerated(parsed);
    }

    return aiFallback(fallbackResponse, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback recommendation due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_RECOMMEND, 'provider-error');
  }
}
