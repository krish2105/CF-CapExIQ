import { NextResponse } from 'next/server';
import { createModelClient } from '@/lib/ai/client';
import { aiGenerated, aiFallback, type AiResponseMeta } from '@/lib/ai/response';
import { parseModelContext } from '@/lib/ai/schemas';
import { parseModelOutput, ThreatRadarSchema } from '@/lib/ai/schemas';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { safeContextJson } from '@/lib/guardrails/aiGuardrails';

export interface ThreatVector {
  dimension: string;
  score: number; // 0 to 100
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  mitigationStrategy: string;
}

export interface ThreatRadarResponse extends AiResponseMeta {
  overallThreatScore: number;
  threatLevel: 'STABLE' | 'MODERATE ELEVATED' | 'HIGH EXPOSURE';
  threatVectors: ThreatVector[];
  executiveRiskSummary: string;
}

const DEFAULT_FALLBACK_THREATS: ThreatRadarResponse = {
  overallThreatScore: 38,
  threatLevel: 'MODERATE ELEVATED',
  threatVectors: [
    {
      dimension: 'DEWA Tariff Escalation',
      score: 45,
      riskLevel: 'Moderate',
      mitigationStrategy: 'Lock in 3-year commercial solar power purchase agreement (PPA) to cap energy costs.',
    },
    {
      dimension: 'Robotics Integration Lead Time',
      score: 55,
      riskLevel: 'Moderate',
      mitigationStrategy: 'Enforce liquid damages clause of 1.5%/week on Swisslog AMR equipment delivery delays.',
    },
    {
      dimension: 'UAE Corporate Tax Impact',
      score: 25,
      riskLevel: 'Low',
      mitigationStrategy: 'Utilize qualifying free-zone reinvestment exemptions under UAE Federal Tax Law.',
    },
    {
      dimension: 'Inflation & Labor Rate Hikes',
      score: 40,
      riskLevel: 'Moderate',
      mitigationStrategy: 'Accelerate Phase-1 automated picking to permanently replace manual shift labor.',
    },
    {
      dimension: 'SLA Demand Conversion',
      score: 30,
      riskLevel: 'Low',
      mitigationStrategy: 'Sign pre-launch SLA volume commitments with NovaRetail GCC anchor merchant partners.',
    },
    {
      dimension: 'WACC Interest Rate Volatility',
      score: 35,
      riskLevel: 'Low',
      mitigationStrategy: 'Hedge EIBOR exposure with a 5-year fixed interest rate swap at 4.85%.',
    },
  ],
  executiveRiskSummary: 'Overall capital risk posture remains well-controlled (Threat Score: 38/100). The primary risk vectors center on warehouse automation commissioning lead times and DEWA commercial power tariff spikes.',
};

export async function POST(req: Request) {
  // Outside the try: the catch below returns fallback threats, so a refusal
  // raised inside it would be swallowed and served as a 200 with content.
  const auth = await requirePermission('risk.view');
  if (!auth.ok) return auth.response;

  const limited = rateLimited('threat-radar', auth.session);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { assumptions, metrics } = parseModelContext(body);

    const fallbackResponse: ThreatRadarResponse = DEFAULT_FALLBACK_THREATS;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return aiFallback(fallbackResponse, 'provider-unconfigured');
    }

    const openai = createModelClient(apiKey);

    const systemPrompt = `You are a Chief Risk Officer AI for NovaRetail GCC.
Analyze financial model assumptions and compute a multi-axis threat radar across 6 dimensions. Scores are 0 to 100.

Return ONLY a JSON object matching this schema:
{
  "overallThreatScore": number,
  "threatLevel": "STABLE" | "MODERATE ELEVATED" | "HIGH EXPOSURE",
  "threatVectors": [
    { "dimension": string, "score": number, "riskLevel": "Low" | "Moderate" | "High" | "Critical", "mitigationStrategy": string }
  ],
  "executiveRiskSummary": string
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
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const outcome = parseModelOutput(ThreatRadarSchema, content);
      if (!outcome.ok) {
        // Logged with the reason: "the model omitted voteCount.reject" and
        // "the provider is down" are different problems that used to produce
        // identical output.
        console.warn('threat-radar: rejected completion - ' + outcome.issue);
        return aiFallback(fallbackResponse, 'parse-failed');
      }
      const parsed = outcome.data;
      return aiGenerated(parsed);
    }

    return aiFallback(fallbackResponse, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback threat radar due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_THREATS, 'provider-error');
  }
}
