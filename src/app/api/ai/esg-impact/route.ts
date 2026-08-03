import { NextResponse } from 'next/server';
import { createModelClient } from '@/lib/ai/client';
import { AI_MAX_TOKENS } from '@/lib/ai/limits';
import { aiGenerated, aiFallback, type AiResponseMeta } from '@/lib/ai/response';
import { parseModelContext } from '@/lib/ai/schemas';
import { parseModelOutput, EsgImpactSchema } from '@/lib/ai/schemas';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { safeContextJson } from '@/lib/guardrails/aiGuardrails';

export interface EsgImpactResponse extends AiResponseMeta {
  esgScore: number; // 0 to 100
  ratingTier: 'AAA (Prime Sustainability)' | 'AA (Superior)' | 'A (Compliant)';
  co2ReductionTonsPerYear: number;
  solarPanelOffsetKWh: number;
  greenNpvBoost: string;
  sustainabilityHighlights: string[];
  bankableGreenLoanEligibility: string;
}

const DEFAULT_FALLBACK_ESG: EsgImpactResponse = {
  esgScore: 92,
  ratingTier: 'AAA (Prime Sustainability)',
  co2ReductionTonsPerYear: 1240,
  solarPanelOffsetKWh: 450000,
  greenNpvBoost: '+AED 1.45M (Carbon Credit Tax Offset)',
  sustainabilityHighlights: [
    'Rooftop 500kW Solar PV Array offsets 42% of warehouse electricity demand.',
    'All-electric AMR autonomous mobile robot fleet eliminates indoor diesel emissions.',
    'High-density vertical tote racking compresses building footprint by 65%.',
    'Qualifies for UAE Green Finance Framework 50 bps loan interest margin discount.',
  ],
  bankableGreenLoanEligibility: 'ELIGIBLE FOR GREEN SUSTAINABILITY-LINKED FINANCING (50 bps Interest Discount)',
};

export async function POST(req: Request) {
  // Outside the try: the catch below returns fallback ESG data, so a refusal
  // raised inside it would be swallowed and served as a 200 with content.
  const auth = await requirePermission('esg.view');
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('esg-impact', auth.session);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { assumptions, metrics } = parseModelContext(body);

    const fallbackResponse: EsgImpactResponse = DEFAULT_FALLBACK_ESG;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return aiFallback(fallbackResponse, 'provider-unconfigured');
    }

    const openai = createModelClient(apiKey);

    const systemPrompt = `You are a Chief Sustainability & ESG Officer AI for NovaRetail GCC.
Calculate ESG sustainability metrics for an automated micro-fulfilment centre.

Return ONLY a JSON object matching this schema:
{
  "esgScore": number,
  "ratingTier": "AAA (Prime Sustainability)" | "AA (Superior)" | "A (Compliant)",
  "co2ReductionTonsPerYear": number,
  "solarPanelOffsetKWh": number,
  "greenNpvBoost": string,
  "sustainabilityHighlights": string[],
  "bankableGreenLoanEligibility": string
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `Assumptions: ${safeContextJson(assumptions)}\n` +
            `Metrics: ${safeContextJson(metrics)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: AI_MAX_TOKENS,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const outcome = parseModelOutput(EsgImpactSchema, content);
      if (!outcome.ok) {
        // Logged with the reason: "the model omitted voteCount.reject" and
        // "the provider is down" are different problems that used to produce
        // identical output.
        console.warn('esg-impact: rejected completion - ' + outcome.issue);
        return aiFallback(fallbackResponse, 'parse-failed');
      }
      const parsed = outcome.data;
      return aiGenerated(parsed);
    }

    return aiFallback(fallbackResponse, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback ESG data due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_ESG, 'provider-error');
  }
}
