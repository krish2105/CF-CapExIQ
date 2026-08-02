import { NextResponse } from 'next/server';
import { createModelClient } from '@/lib/ai/client';
import { aiGenerated, aiFallback, type AiResponseMeta } from '@/lib/ai/response';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { guardInput } from '@/lib/guardrails/aiGuardrails';

export interface GeneratedScenarioStudio extends AiResponseMeta {
  scenarioName: string;
  narrativeDescription: string;
  multipliers: {
    investmentMultiplier: number;
    operatingBenefitMultiplier: number;
    operatingCostMultiplier: number;
    discountRate: number;
  };
  triangularDistribution: {
    minBenefitMultiplier: number;
    modeBenefitMultiplier: number;
    maxBenefitMultiplier: number;
  };
  keyAssumptions: string[];
  macroRiskFactors: string[];
}

const DEFAULT_FALLBACK_SCENARIO: GeneratedScenarioStudio = {
  scenarioName: 'Generative Macro Expansion Scenario',
  narrativeDescription: 'Models a 20% increase in order volume adoption backed by favorable UAE logistics policies, offset by a 5% increase in robotics maintenance OpEx.',
  multipliers: {
    investmentMultiplier: 0.95,
    operatingBenefitMultiplier: 1.20,
    operatingCostMultiplier: 1.05,
    discountRate: 0.105,
  },
  triangularDistribution: {
    minBenefitMultiplier: 1.05,
    modeBenefitMultiplier: 1.20,
    maxBenefitMultiplier: 1.45,
  },
  keyAssumptions: [
    'Urban delivery SLA demand surges to 12,000 orders/day in Year 2.',
    'CapEx outlay compressed by 5% via multi-vendor competitive bidding.',
    'WACC hurdle rate reduced to 10.5% due to favorable commercial credit spreads.',
  ],
  macroRiskFactors: [
    'DEWA utility tariff escalation during peak summer months.',
    'Port customs clearance delays for imported warehouse tote conveyors.',
  ],
};

/** Longest prompt forwarded to the provider. Caps per-call token spend. */
const MAX_PROMPT_CHARS = 600;

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function strList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const out = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return out.length > 0 ? out.slice(0, 8) : fallback;
}

/**
 * Coerce a model response into the declared shape.
 *
 * The handler previously returned `JSON.parse(content)` straight to the client,
 * which renders `multipliers.investmentMultiplier.toFixed(2)` without a guard.
 * A response that omitted `multipliers` — entirely possible even with
 * response_format json_object, since the schema lives only in the prompt —
 * threw a TypeError into the client error boundary. Bounds match the tuner's
 * slider range so an applied scenario is always representable.
 */
function normalizeScenario(raw: unknown, fallback: GeneratedScenarioStudio): GeneratedScenarioStudio {
  if (typeof raw !== 'object' || raw === null) return fallback;
  const r = raw as Record<string, any>;
  const m = (typeof r.multipliers === 'object' && r.multipliers) || {};
  const t = (typeof r.triangularDistribution === 'object' && r.triangularDistribution) || {};

  const min = num(t.minBenefitMultiplier, fallback.triangularDistribution.minBenefitMultiplier, 0.1, 3);
  const max = num(t.maxBenefitMultiplier, fallback.triangularDistribution.maxBenefitMultiplier, 0.1, 3);
  const mode = num(t.modeBenefitMultiplier, fallback.triangularDistribution.modeBenefitMultiplier, 0.1, 3);

  return {
    scenarioName:
      typeof r.scenarioName === 'string' && r.scenarioName.trim() ? r.scenarioName.slice(0, 160) : fallback.scenarioName,
    narrativeDescription:
      typeof r.narrativeDescription === 'string' && r.narrativeDescription.trim()
        ? r.narrativeDescription.slice(0, 1200)
        : fallback.narrativeDescription,
    multipliers: {
      investmentMultiplier: num(m.investmentMultiplier, fallback.multipliers.investmentMultiplier, 0.75, 1.3),
      operatingBenefitMultiplier: num(m.operatingBenefitMultiplier, fallback.multipliers.operatingBenefitMultiplier, 0.5, 1.3),
      operatingCostMultiplier: num(m.operatingCostMultiplier, fallback.multipliers.operatingCostMultiplier, 0.75, 1.3),
      discountRate: num(m.discountRate, fallback.multipliers.discountRate, 0.08, 0.18),
    },
    triangularDistribution: {
      // min ≤ mode ≤ max, whatever order the model emitted them in.
      minBenefitMultiplier: Math.min(min, mode, max),
      modeBenefitMultiplier: Math.min(Math.max(mode, Math.min(min, max)), Math.max(min, max)),
      maxBenefitMultiplier: Math.max(min, mode, max),
    },
    keyAssumptions: strList(r.keyAssumptions, fallback.keyAssumptions),
    macroRiskFactors: strList(r.macroRiskFactors, fallback.macroRiskFactors),
  };
}

export async function POST(req: Request) {
  // Outside the try: the catch below returns a fallback scenario, so a refusal
  // raised inside it would be swallowed and served as a 200 with content.
  const auth = await requirePermission('scenario.author');
  if (!auth.ok) return auth.response;

  const limited = rateLimited('scenario-studio', auth.session);
  if (limited) return limited;

  const rawBody = await req.json().catch(() => ({}));
  const { userPrompt } = (rawBody ?? {}) as { userPrompt?: unknown };

  // Truncating at MAX_PROMPT_CHARS bounded the cost but not the content: the
  // first 500 characters of an injection are still an injection.
  const guarded = guardInput(
    typeof userPrompt === 'string' && userPrompt.trim()
      ? userPrompt.trim().slice(0, MAX_PROMPT_CHARS)
      : 'Simulate GCC e-commerce logistics expansion boom'
  );
  if (!guarded.ok) {
    return NextResponse.json(
      { error: 'guardrail', message: guarded.message, notices: guarded.notices },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const promptText = guarded.text;

  try {

    const fallbackScenario: GeneratedScenarioStudio = {
      ...DEFAULT_FALLBACK_SCENARIO,
      narrativeDescription: `Generated scenario based on user input: "${promptText}". Models a 20% increase in order volume adoption backed by favorable UAE logistics policies, offset by a 5% increase in robotics maintenance OpEx.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return aiFallback(fallbackScenario, 'provider-unconfigured');
    }

    const openai = createModelClient(apiKey);

    const systemPrompt = `You are a Generative Macroeconomic Scenario & Monte Carlo Fitter for NovaRetail GCC.
Generate realistic investment scenario parameters based on user input text.

Return ONLY a JSON object matching this schema:
{
  "scenarioName": string,
  "narrativeDescription": string,
  "multipliers": {
    "investmentMultiplier": number,
    "operatingBenefitMultiplier": number,
    "operatingCostMultiplier": number,
    "discountRate": number
  },
  "triangularDistribution": {
    "minBenefitMultiplier": number,
    "modeBenefitMultiplier": number,
    "maxBenefitMultiplier": number
  },
  "keyAssumptions": string[],
  "macroRiskFactors": string[]
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User Prompt: "${promptText}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        return aiGenerated(normalizeScenario(JSON.parse(content), fallbackScenario));
      } catch {
        // Non-JSON body despite response_format — fall through to the fallback.
        return aiFallback(fallbackScenario, 'parse-failed');
      }
    }

    return aiFallback(fallbackScenario, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback scenario studio due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_SCENARIO, 'provider-error');
  }
}
