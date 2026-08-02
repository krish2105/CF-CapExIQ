import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requirePermission } from '@/lib/auth/apiAuth';
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

  try {
    const body = await req.json();
    const { assumptions, metrics } = body;

    const fallbackResponse: StructedAIResponse = {
      ...DEFAULT_FALLBACK_RECOMMEND,
      decision: metrics?.decisionStatus || 'Approve',
      executiveSummary: `Projected net present value of AED ${metrics?.npv ? (metrics.npv / 1000000).toFixed(2) + 'M' : '12.08M'} and an IRR of ${metrics?.irr ? (metrics.irr * 100).toFixed(1) + '%' : '26.3%'} support capital allocation for NovaRetail GCC's automated micro-fulfilment centre.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return NextResponse.json(fallbackResponse);
    }

    const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });

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
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as StructedAIResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.warn('Using fallback recommendation due to API key / network state:', error?.message);
    return NextResponse.json(DEFAULT_FALLBACK_RECOMMEND);
  }
}
