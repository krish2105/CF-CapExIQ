import { z } from 'zod';

/**
 * Contracts for AI route boundaries.
 *
 * WHY THIS EXISTS
 *
 * Every structured route did `JSON.parse(content) as SomeInterface` and
 * returned the result. That cast is a promise to the compiler, not a check:
 * the object came from a language model over a network, the schema lived only
 * in a prompt, and `response_format: json_object` guarantees *valid JSON*, not
 * *your JSON*. A model that omitted a field, renamed one, or returned a string
 * where a number belonged produced a value the type system swore was correct
 * and the renderer then crashed on — `multipliers.investmentMultiplier
 * .toFixed(2)` on an absent object throws straight into the error boundary.
 *
 * `zod` was already a dependency, used for CSV imports. It was simply never
 * applied to the boundary where the data is least trustworthy.
 *
 * `scenario-studio` had already reached this conclusion independently and
 * hand-rolled `normalizeScenario()`. That function is kept — it clamps into
 * the tuner's slider range, which is domain logic a schema should not own —
 * and now runs behind a schema check rather than instead of one.
 *
 * VALIDATION FAILS TO THE FALLBACK, NOT TO A 500. A malformed completion is a
 * provider problem, and the caller still gets renderable content — now
 * correctly flagged `isFallback` by the work in item 5, so the reader can tell.
 */

// ---------------------------------------------------------------- requests

/**
 * The model-context payload most routes accept.
 *
 * Deliberately permissive about *presence* and strict about *type*. Clients
 * legitimately post partial metrics, so required fields would break them; but
 * `metrics.irr` is fed to `(irr * 100).toFixed(2)`, and a string there yields
 * "NaN%" on a board paper rather than an error anyone notices.
 *
 * Unknown keys are stripped rather than rejected — the store grows fields
 * faster than this schema will, and a new assumption should not 400 the whole
 * request. What reaches the prompt is separately neutralised by
 * `safeContextJson`.
 */
const finiteNumber = z.number().finite();

export const MetricsSchema = z
  .object({
    npv: finiteNumber.optional(),
    irr: finiteNumber.optional(),
    mirr: finiteNumber.optional(),
    profitabilityIndex: finiteNumber.optional(),
    paybackPeriodYears: finiteNumber.optional(),
    discountedPaybackPeriodYears: finiteNumber.optional(),
    totalInitialOutlay: finiteNumber.optional(),
    decisionStatus: z.string().max(120).optional(),
  })
  .passthrough()
  .optional();

export const AssumptionsSchema = z
  .object({
    discountRate: finiteNumber.optional(),
    corporateTaxRate: finiteNumber.optional(),
    projectLifeYears: finiteNumber.optional(),
    automationEquipment: finiteNumber.optional(),
    year1OperatingSavings: finiteNumber.optional(),
  })
  .passthrough()
  .optional();

export const ModelContextRequest = z.object({
  assumptions: AssumptionsSchema,
  metrics: MetricsSchema,
  selectedScenario: z.string().max(60).optional(),
  scenario: z.string().max(60).optional(),
  role: z.string().max(60).optional(),
});

export type ModelContext = z.infer<typeof ModelContextRequest>;

/**
 * Parse a request body, degrading to an empty context rather than rejecting.
 *
 * A 400 here would break the dashboard panels that post whatever the store
 * currently holds. The routes all have sensible defaults for missing figures,
 * so dropping a malformed field is strictly better than refusing the page.
 */
export function parseModelContext(raw: unknown): ModelContext {
  const result = ModelContextRequest.safeParse(raw ?? {});
  return result.success ? result.data : {};
}

// --------------------------------------------------------------- responses

const nonEmpty = z.string().min(1);
const bounded = (max: number) => z.string().min(1).max(max);
const stringList = z.array(nonEmpty).min(1).max(12);

export const RecommendSchema = z.object({
  decision: z.enum(['Approve', 'Phased Implementation', 'Delay Pending Evidence', 'Reject']),
  executiveSummary: bounded(4000),
  keyValueDrivers: stringList,
  principalRisks: stringList,
  managementControls: stringList,
  confidence: z.enum(['High', 'Medium', 'Low']),
  disclaimer: nonEmpty,
});

export const BoardMemoSchema = z.object({
  memoTitle: bounded(300),
  documentRef: bounded(120),
  date: bounded(60),
  auditHash: z.string().max(128),
  targetEntity: bounded(200),
  executiveSummary: bounded(6000),
  financialJustification: bounded(6000),
  keyDrivers: stringList,
  principalRisks: stringList,
  recommendedDecision: bounded(200),
  signoffBlocks: z
    .array(
      z.object({
        role: bounded(60),
        title: bounded(120),
        name: bounded(120),
        status: z.enum(['APPROVED', 'PENDING']),
      })
    )
    .min(1)
    .max(8),
  disclaimer: nonEmpty,
});

export const BoardDebateSchema = z.object({
  consensusDecision: z.enum([
    'APPROVE WITH GATES',
    'UNCONDITIONAL APPROVAL',
    'DEFER INVESTIGATION',
    'REJECT',
  ]),
  consensusSummary: bounded(6000),
  voteCount: z.object({
    approve: z.number().int().min(0).max(20),
    conditional: z.number().int().min(0).max(20),
    defer: z.number().int().min(0).max(20),
    reject: z.number().int().min(0).max(20),
  }),
  statements: z
    .array(
      z.object({
        role: z.enum(['CFO', 'COO', 'CRO', 'Strategy']),
        title: bounded(120),
        name: bounded(120),
        avatar: z.string().max(8),
        verdict: z.enum(['APPROVE', 'CONDITIONAL', 'DEFER', 'REJECT']),
        statement: bounded(2000),
        keyConcernOrDriver: bounded(600),
      })
    )
    .min(1)
    .max(8),
  stageGates: z.array(nonEmpty).max(10),
  disclaimer: nonEmpty,
});

export const EsgImpactSchema = z.object({
  esgScore: z.number().min(0).max(100),
  ratingTier: z.enum(['AAA (Prime Sustainability)', 'AA (Superior)', 'A (Compliant)']),
  co2ReductionTonsPerYear: finiteNumber.min(0),
  solarPanelOffsetKWh: finiteNumber.min(0),
  greenNpvBoost: bounded(200),
  sustainabilityHighlights: stringList,
  bankableGreenLoanEligibility: bounded(300),
});

export const ThreatRadarSchema = z.object({
  overallThreatScore: z.number().min(0).max(100),
  threatLevel: z.enum(['STABLE', 'MODERATE ELEVATED', 'HIGH EXPOSURE']),
  threatVectors: z
    .array(
      z.object({
        dimension: bounded(120),
        score: z.number().min(0).max(100),
        riskLevel: z.enum(['Low', 'Moderate', 'High', 'Critical']),
        mitigationStrategy: bounded(1000),
      })
    )
    .min(1)
    .max(12),
  executiveRiskSummary: bounded(4000),
});

export const RfpNegotiatorSchema = z.object({
  vendorName: bounded(200),
  initialQuotedCapex: finiteNumber.min(0),
  finalNegotiatedCapex: finiteNumber.min(0),
  savingsAchievedAED: finiteNumber,
  savingsAchievedPct: finiteNumber,
  warrantyPeriodYears: finiteNumber.min(0).max(50),
  liquidDamagesPctPerWeek: finiteNumber.min(0).max(100),
  wcsApiLatencyGuaranteeMs: finiteNumber.min(0),
  gameTheoryNashEquilibrium: bounded(600),
  negotiationRounds: z
    .array(
      z.object({
        round: z.number().int().min(1).max(50),
        agentRole: z.enum(['AI Buyer Agent', 'Vendor Sales AI']),
        proposalText: bounded(2000),
        offeredCapex: finiteNumber.min(0),
        concessionSummary: bounded(1000),
      })
    )
    .min(1)
    .max(20),
  executiveSummary: bounded(4000),
});

/**
 * Vendor quote extraction.
 *
 * The tightest bounds in this file, because this is the one response that
 * writes the capital model. A negative or absurd CapEx line reaching
 * `updateAssumptions()` silently changes NPV, so the ceiling is deliberately
 * low enough to catch a misplaced decimal — AED 1bn is two orders of magnitude
 * above the AED 24M project.
 */
const capexAmount = finiteNumber.min(0).max(1_000_000_000);

export const ParsedQuoteSchema = z.object({
  vendorName: bounded(200),
  quotationRef: z.string().max(120),
  quoteDate: z.string().max(60),
  currency: z.string().max(8),
  extractedCapEx: z.object({
    automationEquipment: capexAmount,
    installationIntegration: capexAmount,
    softwareCybersecurity: capexAmount,
    trainingLaunch: capexAmount,
    totalCapEx: capexAmount,
  }),
  itemizedBreakdown: z
    .array(
      z.object({
        itemDescription: bounded(400),
        category: z.enum(['Equipment', 'Installation', 'Software', 'Training']),
        amountAED: capexAmount,
      })
    )
    .max(60),
  vendorNotes: z.string().max(2000),
});

/**
 * Voice intent.
 *
 * Bounds are domain limits, not formatting: this drives `updateAssumptions()`,
 * so an out-of-range rate is rejected rather than clamped. Clamping would
 * silently apply a number the user never said, which on a write path is worse
 * than doing nothing.
 */
export const VoiceIntentSchema = z.object({
  spokenSummary: bounded(2000),
  actionTaken: bounded(600),
  proposedUpdates: z.object({
    discountRate: z.number().min(0).max(1).optional(),
    automationEquipment: capexAmount.optional(),
    year1OperatingSavings: capexAmount.optional(),
    corporateTaxRate: z.number().min(0).max(1).optional(),
    projectLifeYears: z.number().min(1).max(50).optional(),
  }),
});

/**
 * Generative scenario.
 *
 * Ranges here are wider than `normalizeScenario`'s clamps on purpose. This
 * schema asks "is this a scenario object at all?"; the clamp then asks "is it
 * representable on the tuner?". Merging them would make an out-of-range but
 * well-formed answer indistinguishable from a malformed one, and only the
 * second should fall back.
 */
export const ScenarioStudioSchema = z.object({
  scenarioName: bounded(160),
  narrativeDescription: bounded(1200),
  multipliers: z.object({
    investmentMultiplier: finiteNumber,
    operatingBenefitMultiplier: finiteNumber,
    operatingCostMultiplier: finiteNumber,
    discountRate: finiteNumber,
  }),
  triangularDistribution: z.object({
    minBenefitMultiplier: finiteNumber,
    modeBenefitMultiplier: finiteNumber,
    maxBenefitMultiplier: finiteNumber,
  }),
  keyAssumptions: stringList,
  macroRiskFactors: stringList,
});

// ----------------------------------------------------------------- helper

export type ModelOutcome<T> = { ok: true; data: T } | { ok: false; issue: string };

/**
 * Validate a completion against its declared contract.
 *
 * Returns a reason rather than throwing so the caller can log why a fallback
 * was served. "The model omitted `voteCount.reject`" and "the provider is
 * down" are different operational problems that previously produced identical
 * output.
 */
export function parseModelOutput<T>(schema: z.ZodType<T>, content: string): ModelOutcome<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return { ok: false, issue: 'completion was not valid JSON' };
  }

  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  const issue = result.error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');

  return { ok: false, issue: issue || 'did not match the expected shape' };
}
