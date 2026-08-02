import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiGenerated, aiFallback, type AiResponseMeta } from '@/lib/ai/response';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { sanitizeContext } from '@/lib/guardrails/aiGuardrails';
import crypto from 'crypto';

export interface BoardMemoResponse extends AiResponseMeta {
  memoTitle: string;
  documentRef: string;
  date: string;
  auditHash: string;
  targetEntity: string;
  executiveSummary: string;
  financialJustification: string;
  keyDrivers: string[];
  principalRisks: string[];
  recommendedDecision: string;
  signoffBlocks: Array<{
    role: string;
    title: string;
    name: string;
    status: 'APPROVED' | 'PENDING';
  }>;
  disclaimer: string;
}

const DEFAULT_FALLBACK_MEMO: BoardMemoResponse = {
  memoTitle: 'Formal Capital Expenditure Board Investment Memorandum',
  documentRef: 'MEMO-NOVA-2026-A7C925E6',
  date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  auditHash: 'a7c925e6884fbc1267f0a991823bcde45f89123456789abcdef0123456789abc',
  targetEntity: 'NovaRetail GCC (Dubai South Micro-Fulfilment Hub)',
  executiveSummary: 'This Board Investment Memorandum formally requests approval for an AED 24.0M capital outlay for constructing an Automated Micro-Fulfilment Centre in Dubai South.',
  financialJustification: 'The proposal cleared all investment hurdle criteria: Net Present Value (NPV) stands at AED 12.08M discounted at 11.5% WACC, delivering an Internal Rate of Return (IRR) of 26.3%. Initial capital is fully recovered within 3.1 years.',
  keyDrivers: [
    'Annual process & manual labor cost savings of AED 7.50M (71% savings per order).',
    'Incremental 2-hour delivery SLA margin conversion yielding AED 2.50M in Year 1.',
  ],
  principalRisks: [
    'Robotics & WMS software commissioning delay risking Year-1 volume ramp-up.',
    'DEWA commercial electricity tariff inflation exceeding baseline forecast.',
  ],
  recommendedDecision: 'APPROVE WITH STAGE-GATE CONTROLS',
  signoffBlocks: [
    { role: 'CFO', title: 'Chief Financial Officer', name: 'Tariq Al-Mansoor', status: 'APPROVED' },
    { role: 'COO', title: 'Chief Operating Officer', name: 'Sarah Jenkins', status: 'APPROVED' },
    { role: 'CRO', title: 'Chief Risk Officer', name: 'Dr. Faisal Al-Hassan', status: 'PENDING' },
  ],
  disclaimer: 'CONFIDENTIAL BOARD DOCUMENT - For internal governance review only under UAE Commercial Companies Law.',
};

export async function POST(req: Request) {
  // Outside the try: the catch below returns a fallback memo, so a refusal
  // raised inside it would be swallowed and served as a 200 with content.
  const auth = await requirePermission('board.materials');
  if (!auth.ok) return auth.response;

  const limited = rateLimited('board-memo', auth.session);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { assumptions, metrics, selectedScenario } = body;

    // Generate SHA-256 audit hash derived from model state
    const modelPayload = JSON.stringify({
      assumptions,
      npv: metrics?.npv,
      irr: metrics?.irr,
      scenario: selectedScenario,
    });
    const auditHash = crypto.createHash('sha256').update(modelPayload).digest('hex');

    const npv = metrics?.npv ? `AED ${(metrics.npv / 1000000).toFixed(2)}M` : 'AED 12.08M';
    const irr = metrics?.irr ? `${(metrics.irr * 100).toFixed(1)}%` : '26.3%';
    const mirr = metrics?.mirr ? `${(metrics.mirr * 100).toFixed(1)}%` : '19.3%';
    const payback = metrics?.paybackPeriodYears ? `${metrics.paybackPeriodYears.toFixed(1)} years` : '3.1 years';
    const wacc = assumptions?.discountRate ? `${(assumptions.discountRate * 100).toFixed(1)}%` : '11.5%';

    const fallbackMemo: BoardMemoResponse = {
      ...DEFAULT_FALLBACK_MEMO,
      documentRef: `MEMO-NOVA-2026-${auditHash.substring(0, 8).toUpperCase()}`,
      auditHash: auditHash,
      executiveSummary: `This Board Investment Memorandum formally requests approval for an AED 24.0M capital outlay (AED 22.0M CapEx + AED 2.0M Working Capital) for constructing an Automated Micro-Fulfilment Centre in Dubai South.`,
      financialJustification: `The proposal cleared all investment hurdle criteria under deterministic baseline valuation: Net Present Value (NPV) stands at ${npv} discounted at ${wacc} WACC, delivering an Internal Rate of Return (IRR) of ${irr} (MIRR: ${mirr}). Initial capital is fully recovered within ${payback} on a discounted payback basis.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return aiFallback(fallbackMemo, 'provider-unconfigured');
    }

    const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });

    const systemPrompt = `You are a Board Governance Specialist writing a formal Capital Expenditure Memorandum for NovaRetail GCC.
Return ONLY a JSON object matching this schema:
{
  "memoTitle": string,
  "documentRef": string,
  "date": string,
  "auditHash": string,
  "targetEntity": string,
  "executiveSummary": string,
  "financialJustification": string,
  "keyDrivers": string[],
  "principalRisks": string[],
  "recommendedDecision": string,
  "signoffBlocks": [
    { "role": string, "title": string, "name": string, "status": "APPROVED" | "PENDING" }
  ],
  "disclaimer": string
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Financial Context:\n- NPV: ${npv}\n- IRR: ${irr}\n- MIRR: ${mirr}\n- WACC: ${wacc}\n- Payback: ${payback}\n- Scenario: ${sanitizeContext(String(selectedScenario ?? 'Base')).slice(0, 60)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as BoardMemoResponse;
      parsed.auditHash = auditHash; // Ensure exact cryptographic hash
      return aiGenerated(parsed);
    }

    return aiFallback(fallbackMemo, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback board memo due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_MEMO, 'provider-error');
  }
}
