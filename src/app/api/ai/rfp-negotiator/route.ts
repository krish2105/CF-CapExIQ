import { NextResponse } from 'next/server';
import { createModelClient } from '@/lib/ai/client';
import { aiGenerated, aiFallback, type AiResponseMeta } from '@/lib/ai/response';
import { parseModelOutput, RfpNegotiatorSchema } from '@/lib/ai/schemas';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { guardInput } from '@/lib/guardrails/aiGuardrails';

export interface NegotiatedRfpTerms extends AiResponseMeta {
  vendorName: string;
  initialQuotedCapex: number;
  finalNegotiatedCapex: number;
  savingsAchievedAED: number;
  savingsAchievedPct: number;
  warrantyPeriodYears: number;
  liquidDamagesPctPerWeek: number;
  wcsApiLatencyGuaranteeMs: number;
  gameTheoryNashEquilibrium: string;
  negotiationRounds: Array<{
    round: number;
    agentRole: 'AI Buyer Agent' | 'Vendor Sales AI';
    proposalText: string;
    offeredCapex: number;
    concessionSummary: string;
  }>;
  executiveSummary: string;
}

const DEFAULT_FALLBACK_RFP: NegotiatedRfpTerms = {
  vendorName: 'Swisslog Logistics Automation',
  initialQuotedCapex: 25500000,
  finalNegotiatedCapex: 22000000,
  savingsAchievedAED: 3500000,
  savingsAchievedPct: 13.72,
  warrantyPeriodYears: 5,
  liquidDamagesPctPerWeek: 1.5,
  wcsApiLatencyGuaranteeMs: 45,
  gameTheoryNashEquilibrium: 'NASH EQUILIBRIUM ACHIEVED (Payoff Ratio: 1.42x Buyer Value Creation vs 1.15x Vendor Target Margin)',
  negotiationRounds: [
    {
      round: 1,
      agentRole: 'AI Buyer Agent',
      proposalText: 'Submitted counter-proposal targeting 15% CapEx reduction (AED 21.67M) based on regional GCC benchmark quotes.',
      offeredCapex: 21675000,
      concessionSummary: 'Targeted competitive multi-vendor bidding leverage.',
    },
    {
      round: 2,
      agentRole: 'Vendor Sales AI',
      proposalText: 'Swisslog offered AED 22.8M CapEx with 3-year standard warranty and 99.5% uptime SLA.',
      offeredCapex: 22800000,
      concessionSummary: 'Reduced primary AMR fleet price by AED 2.7M.',
    },
    {
      round: 3,
      agentRole: 'AI Buyer Agent',
      proposalText: 'Demanded 5-year extended warranty and 1.5%/week liquid damages penalty clause for commissioning delays exceeding 14 days.',
      offeredCapex: 22000000,
      concessionSummary: 'Conditioned final award on stage-gate WCS API performance benchmark.',
    },
    {
      round: 4,
      agentRole: 'Vendor Sales AI',
      proposalText: 'Accepted AED 22.0M binding CapEx with 5-year warranty, 1.5% liquid damages, and < 45ms API latency guarantee.',
      offeredCapex: 22000000,
      concessionSummary: 'Final agreement reached with full stage-gate enforcement.',
    },
  ],
  executiveSummary: 'AI Game Theory negotiation successfully optimized CapEx outlay from AED 25.50M down to AED 22.00M (saving AED 3.50M / 13.72%), while securing a 5-year extended warranty and 1.5%/week liquid damages penalty clause.',
};

export async function POST(req: Request) {
  // Outside the try: the catch below returns fallback negotiation terms, so a
  // refusal raised inside it would be swallowed and served as a 200.
  const auth = await requirePermission('vendor.negotiate');
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('rfp-negotiator', auth.session);
  if (limited) return limited;

  const rawBody = await req.json().catch(() => ({}));
  const { targetDiscountPct, targetLiquidDamagesPct } = rawBody ?? {};

  const guarded = guardInput(
    typeof rawBody?.vendorName === 'string' && rawBody.vendorName.trim()
      ? rawBody.vendorName
      : 'Swisslog Logistics Automation'
  );
  if (!guarded.ok) {
    return NextResponse.json(
      { error: 'guardrail', message: guarded.message, notices: guarded.notices },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const vendor = guarded.text;

  try {

    const fallbackResponse: NegotiatedRfpTerms = {
      ...DEFAULT_FALLBACK_RFP,
      vendorName: vendor,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return aiFallback(fallbackResponse, 'provider-unconfigured');
    }

    const openai = createModelClient(apiKey);

    const systemPrompt = `You are an AI Multi-Agent Game Theory RFP Negotiator for NovaRetail GCC.
Simulate a multi-round game-theoretic procurement negotiation between an AI Buyer Agent and a Vendor Sales AI for warehouse automation equipment.

Return ONLY a JSON object matching this schema:
{
  "vendorName": string,
  "initialQuotedCapex": number,
  "finalNegotiatedCapex": number,
  "savingsAchievedAED": number,
  "savingsAchievedPct": number,
  "warrantyPeriodYears": number,
  "liquidDamagesPctPerWeek": number,
  "wcsApiLatencyGuaranteeMs": number,
  "gameTheoryNashEquilibrium": string,
  "negotiationRounds": [
    {
      "round": number,
      "agentRole": "AI Buyer Agent" | "Vendor Sales AI",
      "proposalText": string,
      "offeredCapex": number,
      "concessionSummary": string
    }
  ],
  "executiveSummary": string
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Vendor: ${vendor}\nTarget Discount: ${targetDiscountPct || 15}%\nTarget Liquid Damages: ${targetLiquidDamagesPct || 1.5}%` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const outcome = parseModelOutput(RfpNegotiatorSchema, content);
      if (!outcome.ok) {
        // Logged with the reason: "the model omitted voteCount.reject" and
        // "the provider is down" are different problems that used to produce
        // identical output.
        console.warn('rfp-negotiator: rejected completion - ' + outcome.issue);
        return aiFallback(fallbackResponse, 'parse-failed');
      }
      const parsed = outcome.data;
      return aiGenerated(parsed);
    }

    return aiFallback(fallbackResponse, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback RFP negotiation due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_RFP, 'provider-error');
  }
}
