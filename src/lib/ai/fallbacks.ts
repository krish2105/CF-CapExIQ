/**
 * Deterministic fallback generators for the AI advisory suite.
 *
 * The application is demonstrated without an OPENAI_API_KEY, so these
 * fallbacks are what a reviewer actually sees. They are therefore written to
 * be genuinely useful rather than placeholders, and every verdict is
 * CONDITIONAL on the supplied numbers: a negative NPV or a sub-hurdle IRR
 * produces explicitly cautionary language naming the shortfall. Nothing here
 * is unconditionally positive.
 *
 * These functions perform no financial modelling. They select and format
 * figures that the deterministic finance engine has already computed, and
 * compare them (npv > 0, irr > wacc). No cash flow is discounted here.
 */

import { z } from 'zod';
import {
  ArchetypeKey,
  ArchetypeSchema,
  getArchetypeContext,
} from './archetypeContext';
import { aed, pct, type AiAssumptions, type AiMetrics } from './guardrails';

/* ------------------------------------------------------------------ *
 * Ground truth — the NovaRetail GCC base case as produced by the
 * deterministic finance engine. Used whenever the caller omits a value.
 * ------------------------------------------------------------------ */

export const GROUND_TRUTH = {
  entity: 'NovaRetail GCC',
  project: 'Automated Micro-Fulfilment Centre',
  location: 'Dubai, United Arab Emirates',
  reportingCurrency: 'AED',

  totalInitialOutlay: 24000000,
  initialCapitalExpenditure: 22000000,
  initialWorkingCapital: 2000000,
  projectLifeYears: 6,
  discountRate: 0.115,

  npv: 12083628,
  irr: 0.263,
  mirr: 0.1934,
  profitabilityIndex: 1.5035,
  paybackPeriodYears: 3.1,
  discountedPaybackPeriodYears: 3.98,
  presentValueOfInflows: 36083628,

  year1OperatingSavings: 7500000,
  year1ContributionMargin: 2500000,

  scenarios: {
    Optimistic: { npv: 19013977, irr: 0.3359, decision: 'Approve' },
    Base: { npv: 12083628, irr: 0.263, decision: 'Approve' },
    Pessimistic: { npv: -4940625, irr: 0.0823, decision: 'Reject' },
  },
  expectedNpv: 9560152,

  /** ±20% normalised one-way sensitivity, ranked by NPV swing. */
  sensitivity: [
    { rank: 1, variable: 'Operating benefits', swing: 16670000 },
    { rank: 2, variable: 'Project life', swing: 8390000 },
    { rank: 3, variable: 'Capital expenditure', swing: 8250000 },
    { rank: 4, variable: 'WACC / discount rate', swing: 5170000 },
    { rank: 5, variable: 'Operating expenditure', swing: 3570000 },
  ],

  breakEven: {
    /** Operating benefits may fall by this proportion before NPV reaches zero. */
    operatingBenefitShortfallPct: 0.29,
    /** The initial outlay may rise by this proportion before NPV reaches zero. */
    outlayHeadroomPct: 0.504,
    /** The discount rate at which NPV is zero (equals the IRR). */
    npvZeroDiscountRate: 0.263,
  },
} as const;

/* ------------------------------------------------------------------ *
 * Figure resolution
 * ------------------------------------------------------------------ */

export interface ResolvedFigures {
  npv: number;
  irr: number | null;
  mirr: number;
  profitabilityIndex: number;
  paybackPeriodYears: number | null;
  discountedPaybackPeriodYears: number | null;
  wacc: number;
  outlay: number;
  pvInflows: number;
  life: number;
  decisionStatus: string;
  irrText: string;
  createsValue: boolean;
  clearsHurdle: boolean;
  bothTestsPass: boolean;
  /** 'strong' when both tests pass, 'marginal' when one fails, 'failing' when both fail. */
  posture: 'strong' | 'marginal' | 'failing';
}

/**
 * Selects the figures to quote. Caller-supplied values win; the ground-truth
 * base case fills any gap. No arithmetic is performed on cash flows.
 */
export function resolveFigures(metrics?: AiMetrics, assumptions?: AiAssumptions): ResolvedFigures {
  const npv = metrics?.npv ?? GROUND_TRUTH.npv;
  const irr: number | null = metrics?.irr === undefined ? GROUND_TRUTH.irr : metrics.irr;
  const wacc = assumptions?.discountRate ?? GROUND_TRUTH.discountRate;
  const createsValue = npv > 0;
  const clearsHurdle = irr !== null && irr > wacc;
  const bothTestsPass = createsValue && clearsHurdle;

  return {
    npv,
    irr,
    mirr: metrics?.mirr ?? GROUND_TRUTH.mirr,
    profitabilityIndex: metrics?.profitabilityIndex ?? GROUND_TRUTH.profitabilityIndex,
    paybackPeriodYears:
      metrics?.paybackPeriodYears === undefined
        ? GROUND_TRUTH.paybackPeriodYears
        : metrics.paybackPeriodYears,
    discountedPaybackPeriodYears:
      metrics?.discountedPaybackPeriodYears === undefined
        ? GROUND_TRUTH.discountedPaybackPeriodYears
        : metrics.discountedPaybackPeriodYears,
    wacc,
    outlay: Math.abs(metrics?.totalInitialOutlay ?? GROUND_TRUTH.totalInitialOutlay),
    pvInflows:
      metrics?.presentValueOfInflows ??
      metrics?.breakEvenInitialInvestment ??
      GROUND_TRUTH.presentValueOfInflows,
    life: assumptions?.projectLifeYears ?? GROUND_TRUTH.projectLifeYears,
    decisionStatus: metrics?.decisionStatus ?? 'Delay Pending Evidence',
    irrText: irr === null ? 'N/A (no real root)' : pct(irr),
    createsValue,
    clearsHurdle,
    bothTestsPass,
    posture: bothTestsPass ? 'strong' : createsValue || clearsHurdle ? 'marginal' : 'failing',
  };
}

/** One-sentence verdict whose tone tracks the actual numbers. */
export function verdictSentence(f: ResolvedFigures): string {
  if (f.bothTestsPass) {
    return `Both value tests pass: NPV of ${aed(f.npv)} is positive and the IRR of ${f.irrText} clears the ${pct(
      f.wacc
    )} WACC hurdle.`;
  }
  if (!f.createsValue && !f.clearsHurdle) {
    return `Both value tests fail: NPV is ${aed(f.npv)}, a shortfall of ${aed(
      Math.abs(f.npv)
    )} against breakeven, and the IRR (${f.irrText}) does not clear the ${pct(
      f.wacc
    )} WACC hurdle. As modelled the proposal destroys shareholder value.`;
  }
  if (!f.createsValue) {
    return `The value test fails: NPV is negative at ${aed(f.npv)}, a shortfall of ${aed(
      Math.abs(f.npv)
    )} against breakeven, even though the IRR (${f.irrText}) sits above the ${pct(
      f.wacc
    )} WACC. The NPV shortfall is the binding constraint.`;
  }
  return `The return test fails: the IRR (${f.irrText}) does not clear the ${pct(
    f.wacc
  )} WACC hurdle, so the project does not compensate ${GROUND_TRUTH.entity} for its cost of capital despite an NPV of ${aed(
    f.npv
  )}.`;
}

/** Identity fields echoed by every route so the UI can show which lens was applied. */
export function archetypeStamp(key?: ArchetypeKey | null) {
  const ctx = getArchetypeContext(key);
  return { archetype: ctx.key, archetypeLabel: ctx.label, archetypeSupplied: Boolean(key) };
}

const ArchetypeStampShape = {
  archetype: ArchetypeSchema,
  archetypeLabel: z.string().min(1),
  archetypeSupplied: z.boolean().optional(),
};

/* ================================================================== *
 * threat-radar
 * ================================================================== */

export const ThreatRadarSchema = z.object({
  ...ArchetypeStampShape,
  headline: z.string().min(1),
  overallRiskPosture: z.enum(['Contained', 'Moderate', 'Elevated', 'Severe']),
  axes: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(160),
        severity: z.number().min(1).max(10),
        likelihood: z.enum(['Low', 'Medium', 'High']),
        rationale: z.string().min(1),
        mitigation: z.string().min(1),
        linkedDriver: z.string().min(1),
      })
    )
    .min(1)
    .max(8),
  notes: z.array(z.string()).max(8),
});
export type ThreatRadarResult = z.infer<typeof ThreatRadarSchema>;

export function buildThreatRadarFallback(
  key: ArchetypeKey | undefined,
  f: ResolvedFigures
): ThreatRadarResult {
  const ctx = getArchetypeContext(key);
  const stress = GROUND_TRUTH.scenarios.Pessimistic;

  // Financial posture shifts every archetype axis severity by a common
  // amount; the ranking itself remains archetype-driven.
  const posture: ThreatRadarResult['overallRiskPosture'] = f.bothTestsPass
    ? ctx.riskAxes[0].severity >= 9
      ? 'Moderate'
      : 'Contained'
    : f.posture === 'failing'
      ? 'Severe'
      : 'Elevated';

  const severityShift = f.bothTestsPass ? 0 : f.posture === 'failing' ? 1 : 0.5;

  const axes = ctx.riskAxes.map((axis) => ({
    id: axis.id,
    label: axis.label,
    severity: Math.min(10, axis.severity + severityShift),
    likelihood: axis.likelihood,
    rationale: `${axis.description} Sensitivity ranks ${GROUND_TRUTH.sensitivity[0].variable.toLowerCase()} first with an NPV swing of ${aed(
      GROUND_TRUTH.sensitivity[0].swing
    )} at ±20%, so an axis that attacks ${axis.linkedDriver.toLowerCase()} is material to the ${aed(
      f.npv
    )} headline result.`,
    mitigation: axis.mitigation,
    linkedDriver: axis.linkedDriver,
  }));

  const headline = f.bothTestsPass
    ? `${ctx.label}: the base case holds at ${aed(f.npv)} NPV and ${f.irrText} IRR, but the archetype's dominant exposure is ${ctx.riskAxes[0].label.toLowerCase()}, which attacks ${ctx.riskAxes[0].linkedDriver.toLowerCase()} — the highest-ranked sensitivity variable.`
    : `${ctx.label}: ${verdictSentence(f)} The archetype's dominant exposure, ${ctx.riskAxes[0].label.toLowerCase()}, compounds that shortfall rather than offsetting it.`;

  return {
    ...archetypeStamp(key),
    headline,
    overallRiskPosture: posture,
    axes,
    notes: [
      `Break-even headroom: operating benefits may fall ${pct(
        GROUND_TRUTH.breakEven.operatingBenefitShortfallPct,
        1
      )} and the outlay may rise ${pct(
        GROUND_TRUTH.breakEven.outlayHeadroomPct,
        1
      )} before NPV reaches zero. Any axis above capable of moving a driver by more than that headroom is a capital-release blocker, not a monitoring item.`,
      `Stress reference: the pessimistic scenario produces an NPV of ${aed(
        stress.npv
      )} at an IRR of ${pct(stress.irr)}, a rejection case. Severity scores assume that stress case is reachable, not remote.`,
      f.bothTestsPass
        ? 'Severities are archetype priors adjusted for a passing base case. They are not probabilities and must be re-scored by the risk owner before the committee meets.'
        : 'Severities have been uplifted because the supplied figures already fail at least one value test. Do not treat any mitigation below as sufficient to restore the case on its own.',
      'Advisory only. This radar ranks exposures; it does not compute any financial figure.',
    ],
  };
}

/* ================================================================== *
 * board-debate
 * ================================================================== */

export const BoardDebateSchema = z.object({
  ...ArchetypeStampShape,
  motion: z.string().min(1),
  speakers: z
    .array(
      z.object({
        role: z.enum(['CFO', 'COO', 'Chief Risk Officer', 'Non-Executive Director']),
        stance: z.enum(['For', 'Against', 'Conditional']),
        argument: z.string().min(1),
        challenge: z.string().min(1),
      })
    )
    .min(4)
    .max(4),
  synthesis: z.string().min(1),
  unresolvedQuestions: z.array(z.string()).min(1).max(8),
  recommendedNextStep: z.string().min(1),
});
export type BoardDebateResult = z.infer<typeof BoardDebateSchema>;

export function buildBoardDebateFallback(
  key: ArchetypeKey | undefined,
  f: ResolvedFigures
): BoardDebateResult {
  const ctx = getArchetypeContext(key);
  const topRisk = ctx.riskAxes[0];
  const secondRisk = ctx.riskAxes[1] ?? ctx.riskAxes[0];

  const cfoStance = f.bothTestsPass ? 'For' : f.createsValue || f.clearsHurdle ? 'Conditional' : 'Against';
  const cooStance = f.bothTestsPass ? 'Conditional' : 'Conditional';
  const croStance = f.bothTestsPass ? 'Conditional' : 'Against';
  const nedStance = f.bothTestsPass ? 'Conditional' : 'Against';

  return {
    ...archetypeStamp(key),
    motion: `That the board approve capital of ${aed(f.outlay)} for the ${
      ctx.label.toLowerCase()
    } proposal over a ${f.life}-year appraisal at a ${pct(f.wacc)} hurdle rate.`,
    speakers: [
      {
        role: 'CFO',
        stance: cfoStance,
        argument: f.bothTestsPass
          ? `${verdictSentence(f)} Profitability index is ${f.profitabilityIndex.toFixed(
              4
            )}x, so each AED committed returns ${f.profitabilityIndex.toFixed(
              2
            )} AED of present value, and discounted payback lands at ${
              f.discountedPaybackPeriodYears === null ? 'no point inside the appraisal' : `${f.discountedPaybackPeriodYears.toFixed(2)} years`
            }. ${ctx.personaSlant.cfo}`
          : `${verdictSentence(f)} I cannot put a motion to commit ${aed(
              f.outlay
            )} to the board on these figures. ${ctx.personaSlant.cfo}`,
        challenge: `MIRR is ${pct(
          f.mirr
        )} against an IRR of ${f.irrText}: the gap is the reinvestment assumption, and MIRR at the ${pct(
          f.wacc
        )} WACC is the honest number. Anyone arguing this case on IRR alone is arguing on the flattering measure.`,
      },
      {
        role: 'COO',
        stance: cooStance,
        argument: `${ctx.personaSlant.coo} Deliverability, not arithmetic, is where this archetype fails: ${secondRisk.label.toLowerCase()} is a ${secondRisk.likelihood.toLowerCase()}-likelihood exposure and it lands directly on ${secondRisk.linkedDriver.toLowerCase()}. The KPI set I would hold this to is ${ctx.kpiVocabulary
          .slice(0, 3)
          .join(', ')} — none of which appear in the appraisal pack.`,
        challenge: `The ${aed(
          f.npv
        )} headline assumes an operational ramp that operations has not yet committed to in writing. I want the acceptance test defined before, not after, capital release.`,
      },
      {
        role: 'Chief Risk Officer',
        stance: croStance,
        argument: `${ctx.personaSlant.cro} My primary exposure for this archetype is ${topRisk.label.toLowerCase()} — prior severity ${topRisk.severity}/10, ${topRisk.likelihood.toLowerCase()} likelihood. ${topRisk.description}`,
        challenge: `Break-even headroom is thin relative to that exposure: benefits may fall only ${pct(
          GROUND_TRUTH.breakEven.operatingBenefitShortfallPct,
          1
        )} before NPV reaches zero, and the pessimistic case already prints ${aed(
          GROUND_TRUTH.scenarios.Pessimistic.npv
        )}. Mitigation for me is ${topRisk.mitigation}`,
      },
      {
        role: 'Non-Executive Director',
        stance: nedStance,
        argument: `${ctx.personaSlant.ned} I note the sensitivity ranking puts ${GROUND_TRUTH.sensitivity[0].variable.toLowerCase()} first at an NPV swing of ${aed(
          GROUND_TRUTH.sensitivity[0].swing
        )} — larger than the entire ${aed(
          f.npv
        )} of headline value. That means the recommendation is a bet on one variable dressed up as a five-variable model.`,
        challenge: `Expected NPV across the three scenarios is ${aed(
          GROUND_TRUTH.expectedNpv
        )} against a base case of ${aed(
          GROUND_TRUTH.scenarios.Base.npv
        )}. The board is being shown the base case. I want the expected case on the front page and the pessimistic case, at ${aed(
          GROUND_TRUTH.scenarios.Pessimistic.npv
        )}, stated as a live outcome rather than a footnote.`,
      },
    ],
    synthesis: f.bothTestsPass
      ? `The committee is not divided on arithmetic — it is divided on deliverability. Finance supports the motion on the supplied figures; operations and risk support it only against enforceable conditions, and the non-executive challenge on single-variable dependency is unanswered. The defensible landing point is a staged approval: release the first tranche, hold the balance against ${topRisk.label.toLowerCase()} evidence.`
      : `The committee cannot approve on these figures. ${verdictSentence(
          f
        )} Finance, risk and the non-executive director are aligned against commitment; the operational case does not compensate for a failed value test. The proposal should return with a re-baselined benefit case, not with a revised narrative.`,
    unresolvedQuestions: [
      `Who owns ${topRisk.linkedDriver.toLowerCase()} and what evidence will they present at the next gate?`,
      `What is the contractual mechanism that makes "${topRisk.mitigation.split(';')[0].trim()}" enforceable rather than aspirational?`,
      `Which of ${ctx.kpiVocabulary.slice(0, 2).join(' or ')} will be reported to the board monthly after commitment?`,
      f.bothTestsPass
        ? `If the pessimistic case at ${aed(
            GROUND_TRUTH.scenarios.Pessimistic.npv
          )} materialises in year two, what is the abandonment value and who triggers it?`
        : `What specific change to the benefit case would restore a positive NPV, and is it credible?`,
    ],
    recommendedNextStep: f.bothTestsPass
      ? `Approve in principle subject to milestone-gated capital release, with the second tranche conditional on evidence against ${topRisk.label.toLowerCase()}. Human board approval remains required.`
      : `Delay pending evidence. Re-baseline ${GROUND_TRUTH.sensitivity[0].variable.toLowerCase()} — the top-ranked sensitivity variable — and re-run the deterministic model before returning to committee.`,
  };
}

/* ================================================================== *
 * board-memo
 * ================================================================== */

export const BoardMemoSchema = z.object({
  ...ArchetypeStampShape,
  title: z.string().min(1),
  preparedFor: z.string().min(1),
  decisionRequested: z.string().min(1),
  confidence: z.enum(['High', 'Medium', 'Low']),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(120),
        body: z.string().min(1),
        bullets: z.array(z.string()).max(10).optional(),
      })
    )
    .min(4)
    .max(12),
});
export type BoardMemoResult = z.infer<typeof BoardMemoSchema>;

export function buildBoardMemoFallback(
  key: ArchetypeKey | undefined,
  f: ResolvedFigures
): BoardMemoResult {
  const ctx = getArchetypeContext(key);
  const topRisk = ctx.riskAxes[0];

  return {
    ...archetypeStamp(key),
    title: `Capital Appraisal Memorandum — ${ctx.label} — ${GROUND_TRUTH.project}`,
    preparedFor: `${GROUND_TRUTH.entity} Capital Expenditure Committee`,
    decisionRequested: f.bothTestsPass
      ? `Approval in principle of ${aed(
          f.outlay
        )} of capital, subject to milestone-gated release and the controls in section 6.`
      : `A decision to delay pending evidence. The committee is asked NOT to release capital on the figures presented; ${verdictSentence(
          f
        ).charAt(0).toLowerCase()}${verdictSentence(f).slice(1)}`,
    confidence: f.bothTestsPass ? 'Medium' : 'Low',
    sections: [
      {
        heading: '1. Purpose and Recommendation',
        body: `This memorandum presents the capital appraisal for the ${ctx.label.toLowerCase()} proposal (${
          GROUND_TRUTH.project
        }, ${GROUND_TRUTH.location}) over a ${f.life}-year life at a ${pct(
          f.wacc
        )} weighted average cost of capital. ${verdictSentence(f)} The engine decision status is "${
          f.decisionStatus
        }". ${
          f.bothTestsPass
            ? 'The recommendation is approval in principle against enforceable conditions, not unconditional commitment.'
            : 'The recommendation is to withhold capital and return with a re-baselined benefit case.'
        }`,
        bullets: [
          `Net present value: ${aed(f.npv)}`,
          `Internal rate of return: ${f.irrText} against a ${pct(f.wacc)} hurdle`,
          `Modified IRR: ${pct(f.mirr)} (interim cash reinvested at WACC)`,
          `Profitability index: ${f.profitabilityIndex.toFixed(4)}x`,
          `Payback: ${
            f.paybackPeriodYears === null ? 'not achieved within the appraisal period' : `${f.paybackPeriodYears.toFixed(2)} years`
          }; discounted payback: ${
            f.discountedPaybackPeriodYears === null
              ? 'not achieved within the appraisal period'
              : `${f.discountedPaybackPeriodYears.toFixed(2)} years`
          }`,
        ],
      },
      {
        heading: '2. Investment Summary',
        body: `The proposal commits an initial outlay of ${aed(
          f.outlay
        )}, comprising capital expenditure of ${aed(
          GROUND_TRUTH.initialCapitalExpenditure
        )} and an incremental working capital injection of ${aed(
          GROUND_TRUTH.initialWorkingCapital
        )} recovered at the end of the appraisal period. Against that outlay the model discounts ${aed(
          f.pvInflows
        )} of inflows, giving the profitability index of ${f.profitabilityIndex.toFixed(
          4
        )}x quoted above. All figures are produced by the deterministic finance engine; nothing in this memorandum has been recalculated.`,
        bullets: ctx.capexCategories.map((c) => `Capital category in scope: ${c}`),
      },
      {
        heading: '3. Strategic Rationale and Archetype Lens',
        body: `${ctx.summary} This appraisal has been read through the ${ctx.label.toLowerCase()} lens, which changes what matters: the analysis modules that carry signal are ${ctx.relevantModules.join(
          ', '
        )}, while ${ctx.irrelevantModules.join(
          ', '
        )} carry little or none and have been deliberately excluded from the recommendation. The committee should hold management to the archetype KPI set rather than to generic financial reporting.`,
        bullets: ctx.kpiVocabulary.map((k) => `KPI to be reported post-commitment: ${k}`),
      },
      {
        heading: '4. Scenario and Sensitivity Position',
        body: `Three scenarios were evaluated by the deterministic engine. Optimistic returns ${aed(
          GROUND_TRUTH.scenarios.Optimistic.npv
        )} at ${pct(
          GROUND_TRUTH.scenarios.Optimistic.irr
        )}; base returns ${aed(GROUND_TRUTH.scenarios.Base.npv)} at ${pct(
          GROUND_TRUTH.scenarios.Base.irr
        )} and supports approval; pessimistic returns ${aed(
          GROUND_TRUTH.scenarios.Pessimistic.npv
        )} at ${pct(
          GROUND_TRUTH.scenarios.Pessimistic.irr
        )} and is a rejection case. Probability-weighted expected NPV is ${aed(
          GROUND_TRUTH.expectedNpv
        )} — materially below the base case, which is the figure the committee is asked to weigh.`,
        bullets: GROUND_TRUTH.sensitivity.map(
          (s) => `Rank ${s.rank}: ${s.variable} — NPV swing ${aed(s.swing)} at ±20%`
        ),
      },
      {
        heading: '5. Principal Risks',
        body: `The dominant exposure for this archetype is ${topRisk.label.toLowerCase()} (severity ${
          topRisk.severity
        }/10, ${topRisk.likelihood.toLowerCase()} likelihood). ${
          topRisk.description
        } Break-even analysis shows benefits may fall ${pct(
          GROUND_TRUTH.breakEven.operatingBenefitShortfallPct,
          1
        )} and the outlay may rise ${pct(
          GROUND_TRUTH.breakEven.outlayHeadroomPct,
          1
        )} before NPV reaches zero; NPV is zero at a ${pct(
          GROUND_TRUTH.breakEven.npvZeroDiscountRate
        )} discount rate. Those are the tolerances against which each risk below should be judged.`,
        bullets: ctx.riskAxes.map(
          (a) => `${a.label} (${a.severity}/10, ${a.likelihood} likelihood) — attacks ${a.linkedDriver}`
        ),
      },
      {
        heading: '6. Management Controls and Conditions',
        body: f.bothTestsPass
          ? 'Approval is recommended only against the following enforceable conditions. Each is a capital-release gate, not a management intention.'
          : 'Capital should not be released. The following conditions define what would have to change before the proposal returns to committee.',
        bullets: [
          ...ctx.riskAxes.slice(0, 3).map((a) => a.mitigation),
          'Milestone-gated capital release, with tranches tied to written evidence rather than calendar dates.',
          ...(f.bothTestsPass
            ? []
            : [
                `Re-baseline ${GROUND_TRUTH.sensitivity[0].variable.toLowerCase()} — the top-ranked sensitivity variable — and re-run the deterministic model before returning.`,
              ]),
        ],
      },
      {
        heading: '7. Governance and Limitations',
        body: `${GROUND_TRUTH.entity} is a hypothetical entity used for academic capital-budgeting decision modelling. This memorandum was drafted by the deterministic advisory engine because no AI model is configured, or because the model call did not return a usable response. It restates figures produced by the finance engine and applies archetype-specific judgement rules; it does not compute financial results and does not constitute an approval. A qualified human decision-maker must review every assumption before any capital is committed.`,
      },
    ],
  };
}

/* ================================================================== *
 * scenario-studio
 * ================================================================== */

export const ScenarioStudioSchema = z.object({
  ...ArchetypeStampShape,
  note: z.string().min(1),
  proposedScenarios: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        rationale: z.string().min(1),
        multipliers: z.object({
          operatingBenefits: z.number().min(0).max(3),
          capex: z.number().min(0).max(3),
          opex: z.number().min(0).max(3),
          discountRate: z.number().min(0).max(3),
          projectLife: z.number().min(0).max(3),
        }),
        watchIndicator: z.string().min(1),
      })
    )
    .min(1)
    .max(6),
});
export type ScenarioStudioResult = z.infer<typeof ScenarioStudioSchema>;

export function buildScenarioStudioFallback(
  key: ArchetypeKey | undefined,
  f: ResolvedFigures
): ScenarioStudioResult {
  const ctx = getArchetypeContext(key);

  return {
    ...archetypeStamp(key),
    note: `These are proposed ASSUMPTION SETS only. Each multiplier is applied to the corresponding base assumption by the deterministic finance engine, which alone produces NPV, IRR and payback. No result is asserted here. They extend the standard Optimistic (${aed(
      GROUND_TRUTH.scenarios.Optimistic.npv
    )}) / Base (${aed(GROUND_TRUTH.scenarios.Base.npv)}) / Pessimistic (${aed(
      GROUND_TRUTH.scenarios.Pessimistic.npv
    )}) triple with cases specific to the ${ctx.label.toLowerCase()} archetype. ${
      f.bothTestsPass
        ? `Because the base case passes both value tests, these scenarios are deliberately weighted towards the downside — the useful question is what breaks the case, not what improves it. Note the break-even tolerance: benefits may fall only ${pct(
            GROUND_TRUTH.breakEven.operatingBenefitShortfallPct,
            1
          )} before NPV reaches zero, so any benefits multiplier below ${(
            1 - GROUND_TRUTH.breakEven.operatingBenefitShortfallPct
          ).toFixed(2)} should be expected to produce a negative result.`
        : `Because the supplied base case already fails a value test, a recovery case has been included to identify what magnitude of change would be required — not to suggest that it is achievable.`
    }`,
    proposedScenarios: [
      ...ctx.scenarioThemes.map((theme) => ({
        name: theme.name,
        rationale: theme.rationale,
        multipliers: { ...theme.multipliers },
        watchIndicator: `Monitor ${
          ctx.kpiVocabulary[ctx.scenarioThemes.indexOf(theme) % ctx.kpiVocabulary.length]
        } — this scenario becomes live when that indicator moves against plan for two consecutive reporting periods.`,
      })),
      ...(f.bothTestsPass
        ? [
            {
              name: 'Break-Even Boundary',
              rationale: `Sets operating benefits at the break-even shortfall the engine has already identified (${pct(
                GROUND_TRUTH.breakEven.operatingBenefitShortfallPct,
                1
              )}), to show the committee exactly where the case turns. The engine will confirm the resulting NPV.`,
              multipliers: {
                operatingBenefits: Number((1 - GROUND_TRUTH.breakEven.operatingBenefitShortfallPct).toFixed(2)),
                capex: 1.0,
                opex: 1.0,
                discountRate: 1.0,
                projectLife: 1.0,
              },
              watchIndicator: `Monitor ${ctx.kpiVocabulary[0]} against the underwritten level; a sustained gap of this size removes all headroom.`,
            },
            {
              name: 'Combined Downside',
              rationale:
                'Applies the archetype top-two exposures simultaneously rather than independently, since one-way sensitivity understates correlated failure.',
              multipliers: { operatingBenefits: 0.75, capex: 1.15, opex: 1.15, discountRate: 1.1, projectLife: 1.0 },
              watchIndicator: `Monitor ${ctx.riskAxes[0].linkedDriver.toLowerCase()} and ${(
                ctx.riskAxes[1] ?? ctx.riskAxes[0]
              ).linkedDriver.toLowerCase()} jointly, not separately.`,
            },
          ]
        : [
            {
              name: 'Recovery Requirement',
              rationale: `Identifies the scale of benefit improvement and cost discipline that would be needed to move the case back above the ${pct(
                f.wacc
              )} hurdle from a starting NPV of ${aed(
                f.npv
              )}. Proposed as a diagnostic, not as a forecast — the engine must confirm whether it is sufficient.`,
              multipliers: { operatingBenefits: 1.35, capex: 0.9, opex: 0.9, discountRate: 1.0, projectLife: 1.0 },
              watchIndicator: `Ask the sponsor to evidence, in writing, how ${ctx.kpiVocabulary[0]} improves by this magnitude before the case returns to committee.`,
            },
          ]),
    ],
  };
}

/* ================================================================== *
 * esg-impact
 * ================================================================== */

export const EsgImpactSchema = z.object({
  ...ArchetypeStampShape,
  notApplicable: z.boolean(),
  explanation: z.string().min(1),
  dimensions: z
    .array(
      z.object({
        pillar: z.enum(['Environmental', 'Social', 'Governance']),
        metric: z.string().min(1).max(160),
        commentary: z.string().min(1),
        dataAvailability: z.enum(['Auditable', 'Estimated', 'Not measurable']),
      })
    )
    .max(12),
  greenFinancingOptions: z.array(z.string()).max(8),
  caveats: z.array(z.string()).max(8),
});
export type EsgImpactResult = z.infer<typeof EsgImpactSchema>;

export function buildEsgImpactFallback(
  key: ArchetypeKey | undefined,
  f: ResolvedFigures
): EsgImpactResult {
  const ctx = getArchetypeContext(key);

  // Asset-level ESG and green financing are only meaningful where the
  // investment creates an owned physical asset. For the three intangible
  // archetypes the honest answer is that this module does not apply —
  // inventing ESG content for them would be greenwashing.
  if (!ctx.esgApplicable) {
    return {
      ...archetypeStamp(key),
      notApplicable: true,
      explanation: `ESG and green-financing commentary is not applicable to the ${ctx.label.toLowerCase()} archetype. ${
        ctx.esgAngle
      } No environmental impact figures are asserted for this proposal, because none can be substantiated from the capital structure of the investment. Producing ESG narrative here would be unsupported by evidence.`,
      dimensions: [],
      greenFinancingOptions: [],
      caveats: [
        'This is a deliberate exclusion, not a data gap. Do not substitute generic corporate sustainability language for asset-level ESG analysis.',
        `If this proposal is later restructured to include owned physical assets, re-run this module under the appropriate archetype (${['new-branch', 'machinery', 'facility-expansion', 'automation', 'market-entry'].join(', ')}).`,
        'Product, packaging and supply-chain footprint remain in scope for the relevant functional review; they are simply not capital-appraisal ESG inputs.',
      ],
    };
  }

  return {
    ...archetypeStamp(key),
    notApplicable: false,
    explanation: `The ${ctx.label.toLowerCase()} archetype creates an owned physical asset, so asset-level ESG metrics are measurable and material to financing terms. ${
      ctx.esgAngle
    } ${
      f.bothTestsPass
        ? `With a base-case NPV of ${aed(
            f.npv
          )} the proposal has financial headroom to absorb the incremental cost of a certified specification; that cost should be added to capex and re-run through the engine rather than assumed to be free.`
        : `Note that the proposal does not currently pass both value tests (${verdictSentence(
            f
          ).toLowerCase()}). Any sustainability-linked margin benefit is a second-order effect and must not be used to argue a failing case across the hurdle.`
    }`,
    dimensions: [
      {
        pillar: 'Environmental',
        metric: 'Operational energy intensity (kWh per unit of output or per square metre)',
        commentary: `Directly measurable from utility metering once operational and directly linked to the operating expenditure line of the model. This is the ESG metric with the clearest financial transmission for this archetype, since energy sits inside OpEx — ranked ${
          GROUND_TRUTH.sensitivity[4].rank
        } in the sensitivity analysis with an NPV swing of ${aed(GROUND_TRUTH.sensitivity[4].swing)}.`,
        dataAvailability: 'Auditable',
      },
      {
        pillar: 'Environmental',
        metric: 'Embodied carbon in the capital asset',
        commentary:
          'Derived from supplier environmental product declarations at procurement. Estimable at design stage; auditable only where suppliers provide declarations, which should be made a tender requirement rather than a preference.',
        dataAvailability: 'Estimated',
      },
      {
        pillar: 'Environmental',
        metric: 'End-of-life recyclability and waste diversion',
        commentary: `Relevant over the ${f.life}-year appraisal because it affects the terminal value assumption. An asset with a documented take-back or recycling route holds residual value better than one without.`,
        dataAvailability: 'Estimated',
      },
      {
        pillar: 'Social',
        metric:
          ctx.key === 'automation'
            ? 'Workforce transition: roles displaced, redeployed and retrained'
            : 'Workforce health, safety and local employment content',
        commentary:
          ctx.key === 'automation'
            ? `This is the material social metric for an automation case and it is also a financial one: the transition cost belongs inside the ${aed(
                f.outlay
              )} outlay. A funded, published redeployment plan is both the social control and the condition on which the labour saving is actually realisable.`
            : 'Recordable incident rate and local employment content are auditable from the first month of operation and are standard covenants in sustainability-linked facilities.',
        dataAvailability: 'Auditable',
      },
      {
        pillar: 'Governance',
        metric: 'Supply-chain and contractor due diligence',
        commentary: `Applies to the capital categories in scope for this archetype (${ctx.capexCategories
          .slice(0, 3)
          .join(', ')}). Auditable through procurement records; a precondition of most green financing instruments.`,
        dataAvailability: 'Auditable',
      },
    ],
    greenFinancingOptions: [
      'Sustainability-linked loan with a margin ratchet tied to the verified energy-intensity metric above. Model the ratchet as a discount-rate adjustment only once the covenant is agreed — not before.',
      'Green equipment financing or asset-backed lease against the certified specification, which can also transfer part of the residual-value risk.',
      'Green building certification (LEED / Estidama) where built area is in scope, which affects both financing terms and asset resale value.',
      'Note: any financing benefit changes the WACC input to the deterministic engine. It must be re-run, not asserted — WACC ranks 4 in the sensitivity analysis with an NPV swing of ' +
        aed(GROUND_TRUTH.sensitivity[3].swing) +
        '.',
    ],
    caveats: [
      'No ESG figure is computed here. Every metric above is a measurement definition and a data-availability judgement, not a result.',
      'Estimated metrics must not be reported externally as auditable. The distinction is marked per row.',
      `${GROUND_TRUTH.entity} is a hypothetical entity used for academic capital-budgeting decision modelling.`,
    ],
  };
}

/* ================================================================== *
 * parse-quote
 * ================================================================== */

export const ParseQuoteSchema = z.object({
  ...ArchetypeStampShape,
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1).max(300),
        amount: z.number().finite(),
        currency: z.string().min(1).max(8),
        category: z.string().min(1).max(80),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(100),
  unparsed: z
    .array(
      z.object({
        text: z.string().min(1).max(400),
        reason: z.string().min(1).max(300),
      })
    )
    .max(100),
  overallConfidence: z.number().min(0).max(1),
  currencyNote: z.string().min(1),
  warnings: z.array(z.string()).max(10),
});
export type ParseQuoteResult = z.infer<typeof ParseQuoteSchema>;

const CURRENCY_TOKENS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\bAED\b|\bDHS?\b|د\.إ/i, code: 'AED' },
  { pattern: /\bUSD\b|\bUS\$|\$/i, code: 'USD' },
  { pattern: /\bEUR\b|€/i, code: 'EUR' },
  { pattern: /\bGBP\b|£/i, code: 'GBP' },
  { pattern: /\bSAR\b/i, code: 'SAR' },
  { pattern: /\bQAR\b/i, code: 'QAR' },
  { pattern: /\bINR\b|₹/i, code: 'INR' },
];

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['robot', 'agv', 'amr', 'asrs', 'shuttle', 'conveyor', 'sorter', 'automation'], category: 'Robotics & automation equipment' },
  { keywords: ['wms', 'wcs', 'software', 'licence', 'license', 'saas', 'subscription', 'integration'], category: 'WMS / WCS software & integration' },
  { keywords: ['gpu', 'compute', 'inference', 'cloud', 'hosting', 'token'], category: 'Model licensing & prepaid compute' },
  { keywords: ['install', 'commission', 'erect', 'mobilisation', 'mobilization'], category: 'Installation & commissioning' },
  { keywords: ['freight', 'shipping', 'customs', 'duty', 'duties', 'logistics'], category: 'Freight & duties' },
  { keywords: ['training', 'retrain', 'severance', 'redundancy', 'gratuity', 'end of service'], category: 'Workforce transition & retraining' },
  { keywords: ['spare', 'tooling', 'consumable', 'mould', 'mold', 'die'], category: 'Spares & tooling' },
  { keywords: ['consult', 'design fee', 'engineering fee', 'legal', 'advisory', 'professional', 'audit'], category: 'Professional fees' },
  { keywords: ['civil', 'structural', 'construction', 'foundation', 'slab', 'shell'], category: 'Civil & structural works' },
  { keywords: ['mep', 'hvac', 'electrical', 'plumbing', 'chiller', 'utility', 'substation', 'sprinkler'], category: 'MEP & utilities' },
  { keywords: ['fit-out', 'fitout', 'fit out', 'shopfit', 'joinery', 'furniture', 'partition'], category: 'Fit-out' },
  { keywords: ['signage', 'branding'], category: 'Signage & branding' },
  { keywords: ['marketing', 'advertis', 'campaign', 'launch spend', 'media'], category: 'Launch marketing' },
  { keywords: ['permit', 'noc', 'municipal', 'authority', 'civil defence', 'civil defense', 'trade licence', 'trade license'], category: 'Authority fees & permits' },
  { keywords: ['inventory', 'stock build', 'working capital'], category: 'Working capital' },
  { keywords: ['contingency', 'provisional sum'], category: 'Contingency' },
  { keywords: ['rack', 'racking', 'shelving', 'refriger', 'cold room'], category: 'Refrigeration & MEP' },
  { keywords: ['pos', 'server', 'network', 'laptop', 'hardware', 'scanner', ' it '], category: 'IT & POS' },
  { keywords: ['machine', 'equipment', 'plant', 'unit price'], category: 'Equipment & machinery' },
];

/** Lines that look like totals, taxes or headers are never treated as capex line items. */
const NON_ITEM_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(sub)?total\b|\bgrand total\b|\bsum\b/i, reason: 'Looks like a total or subtotal line rather than a capex line item; totals are not extracted so that no figure is double-counted.' },
  { pattern: /\bvat\b|\btax\b|\bexcise\b/i, reason: 'Looks like a tax line. Tax treatment is set in the model assumptions, not seeded from a quotation.' },
  { pattern: /\bdiscount\b|\brebate\b/i, reason: 'Looks like a discount or rebate line; it modifies other lines rather than standing as a capex item.' },
  { pattern: /\b(quotation|quote no|invoice|ref\.?|date|validity|terms|payment terms|page \d)\b/i, reason: 'Looks like document metadata rather than a priced line item.' },
];

/**
 * A monetary amount. Either a group-separated figure (1,250,000 / 1 250 000)
 * or a plain figure (45000 / 640000.50). The separator must be exactly one
 * character followed by three digits, which prevents two adjacent amounts
 * from being read as a single value.
 */
const AMOUNT_PATTERN = /\d{1,3}(?:[,\u00A0 ]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g;

/** Figures at or above this value are treated as candidate prices, not quantities. */
const AMBIGUITY_FLOOR = 1000;

function detectCurrency(line: string): string | null {
  for (const token of CURRENCY_TOKENS) {
    if (token.pattern.test(line)) return token.code;
  }
  return null;
}

function detectCategory(line: string, allowed: string[]): { category: string; matched: boolean } {
  const haystack = ` ${line.toLowerCase()} `;
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((k) => haystack.includes(k))) {
      return { category: entry.category, matched: allowed.includes(entry.category) };
    }
  }
  return { category: 'Uncategorised', matched: false };
}

/**
 * Deterministic vendor-quotation parser. Extracts one capex line item per
 * input line where an amount can be identified with confidence. Anything
 * ambiguous — no amount, multiple candidate amounts, a totals or tax line —
 * is pushed to `unparsed` with a stated reason. It never guesses silently.
 */
export function buildParseQuoteFallback(
  key: ArchetypeKey | undefined,
  quoteText: string,
  defaultCurrency: string
): ParseQuoteResult {
  const ctx = getArchetypeContext(key);
  const lineItems: ParseQuoteResult['lineItems'] = [];
  const unparsed: ParseQuoteResult['unparsed'] = [];
  let currencyInferredCount = 0;

  const rawLines = quoteText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of rawLines) {
    const nonItem = NON_ITEM_PATTERNS.find((p) => p.pattern.test(line));
    if (nonItem) {
      unparsed.push({ text: line.slice(0, 400), reason: nonItem.reason });
      continue;
    }

    // Candidate amounts: 1,250,000 / 1250000.00 / 1 250 000 / 45000.
    // Group separators must be a SINGLE character followed by exactly three
    // digits, so two adjacent figures on one line ("145,000  1,740,000") are
    // read as two candidates rather than silently concatenated into one.
    const amountMatches = line.match(AMOUNT_PATTERN) || [];
    const candidates = amountMatches
      .map((m) => ({ raw: m.trim(), value: Number(m.replace(/[,\s\u00A0]/g, '')) }))
      .filter((c) => Number.isFinite(c.value) && c.value > 0);

    if (candidates.length === 0) {
      unparsed.push({
        text: line.slice(0, 400),
        reason: 'No monetary amount could be identified on this line. Not extracted rather than guessed.',
      });
      continue;
    }

    // Where several plausible priced figures appear on one row (quantity x
    // unit price x line total) the line is NOT resolved by guesswork — it is
    // pushed to `unparsed` for manual splitting.
    const chosen = candidates[candidates.length - 1];
    const ambiguous = candidates.filter((c) => c.value >= AMBIGUITY_FLOOR).length > 1;

    if (ambiguous) {
      unparsed.push({
        text: line.slice(0, 400),
        reason: `Multiple candidate amounts on one line (${candidates
          .map((c) => c.raw)
          .slice(0, 4)
          .join(', ')}) — most likely quantity, unit price and line total. Not extracted; split the line manually rather than accepting a guess.`,
      });
      continue;
    }

    const currencyCode = detectCurrency(line);
    if (!currencyCode) currencyInferredCount += 1;

    const { category, matched } = detectCategory(line, ctx.capexCategories);

    const description =
      line
        .replace(AMOUNT_PATTERN, ' ')
        .replace(/AED|USD|EUR|GBP|SAR|QAR|INR|د\.إ|\$|€|£|₹/gi, ' ')
        .replace(/[|;:\-–—\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim() || 'Unlabelled line item';

    let confidence = 0.4;
    if (currencyCode) confidence += 0.2;
    if (/[,\s]\d{3}\b|\.\d{2}\b/.test(chosen.raw)) confidence += 0.1;
    if (category !== 'Uncategorised') confidence += 0.15;
    if (matched) confidence += 0.1;
    if (description !== 'Unlabelled line item' && description.length >= 6) confidence += 0.05;
    confidence = Math.max(0.05, Math.min(0.95, Number(confidence.toFixed(2))));

    lineItems.push({
      description: description.slice(0, 300),
      amount: chosen.value,
      currency: currencyCode ?? defaultCurrency,
      category,
      confidence,
    });
  }

  const overallConfidence =
    lineItems.length === 0
      ? 0
      : Number(
          (
            (lineItems.reduce((acc, item) => acc + item.confidence, 0) / lineItems.length) *
            (lineItems.length / (lineItems.length + unparsed.length))
          ).toFixed(2)
        );

  const warnings: string[] = [
    'Extraction only. No amount has been summed, converted or discounted — the deterministic finance engine owns every calculation.',
    `Categories are drawn from the ${ctx.label.toLowerCase()} capex taxonomy: ${ctx.capexCategories.join(', ')}. Items marked "Uncategorised" require manual assignment before they seed the model.`,
  ];
  if (currencyInferredCount > 0) {
    warnings.push(
      `${currencyInferredCount} line item(s) carried no explicit currency and were defaulted to ${defaultCurrency}. Confirm before use — a currency error here propagates into the outlay.`
    );
  }
  if (unparsed.length > 0) {
    warnings.push(
      `${unparsed.length} line(s) were not extracted. Review the unparsed list; an omitted capex line understates the initial outlay, and the model shows the outlay may rise only ${pct(
        GROUND_TRUTH.breakEven.outlayHeadroomPct,
        1
      )} before NPV reaches zero.`
    );
  }
  if (lineItems.length === 0) {
    warnings.push('No capex line items could be extracted from the supplied text. Nothing has been assumed.');
  }

  return {
    ...archetypeStamp(key),
    lineItems,
    unparsed,
    overallConfidence,
    currencyNote: `Amounts are reported in the currency detected on each line; where none was detected the default of ${defaultCurrency} was applied and the item confidence reduced. No FX conversion has been performed.`,
    warnings,
  };
}

/* ================================================================== *
 * live-macro
 * ================================================================== */

export const MacroInputSchema = z.object({
  name: z.string().min(1).max(120),
  value: z.union([z.number().finite(), z.string().max(120)]).optional(),
  unit: z.string().max(40).optional(),
  asOf: z.string().max(40).optional(),
  source: z.string().max(160).optional(),
});
export type MacroInput = z.infer<typeof MacroInputSchema>;

export const LiveMacroSchema = z.object({
  ...ArchetypeStampShape,
  dataProvenance: z.string().min(1),
  asOf: z.string().max(40).nullable(),
  summary: z.string().min(1),
  drivers: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        suppliedValue: z.string().max(160).nullable(),
        relevance: z.string().min(1),
        transmission: z.string().min(1),
        directionOnNpv: z.enum(['Increases NPV', 'Reduces NPV', 'Ambiguous', 'Not determinable']),
      })
    )
    .max(12),
  missingInputs: z.array(z.string()).max(12),
  caveats: z.array(z.string()).max(8),
});
export type LiveMacroResult = z.infer<typeof LiveMacroSchema>;

const NO_LIVE_ACCESS_NOTICE =
  'This route has NO live market data access. It reasons exclusively over the values supplied in the request body. Any figure not listed below was not supplied and has not been substituted, estimated or retrieved.';

function formatMacroValue(input: MacroInput): string | null {
  if (input.value === undefined) return null;
  const base = typeof input.value === 'number' ? input.value.toLocaleString('en-US') : input.value;
  return input.unit ? `${base} ${input.unit}` : base;
}

export function buildLiveMacroFallback(
  key: ArchetypeKey | undefined,
  supplied: MacroInput[],
  f: ResolvedFigures
): LiveMacroResult {
  const ctx = getArchetypeContext(key);
  const byName = new Map(supplied.map((item) => [item.name.toLowerCase(), item]));

  const matchSupplied = (driver: string): MacroInput | undefined => {
    const lower = driver.toLowerCase();
    const direct = byName.get(lower);
    if (direct) return direct;
    return supplied.find(
      (item) =>
        lower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(lower.split(' ')[0])
    );
  };

  const drivers = ctx.macroDrivers.map((driver) => {
    const match = matchSupplied(driver);
    const value = match ? formatMacroValue(match) : null;
    const isRateDriver = /rate|premium|wacc/i.test(driver);
    const isCostDriver = /cost|price|inflation|tariff|wage|fee|rent/i.test(driver);

    return {
      name: driver,
      suppliedValue: value,
      relevance: value
        ? `Supplied${match?.asOf ? ` as at ${match.asOf}` : ''}${match?.source ? ` (source: ${match.source})` : ''}. Ranked material for the ${ctx.label.toLowerCase()} archetype.`
        : `Not supplied in this request. Material for the ${ctx.label.toLowerCase()} archetype but no value was provided, so no position is taken on it.`,
      transmission: isRateDriver
        ? `Reaches the model through the discount rate, currently ${pct(
            f.wacc
          )}. The discount rate ranks ${GROUND_TRUTH.sensitivity[3].rank} in the sensitivity analysis with an NPV swing of ${aed(
            GROUND_TRUTH.sensitivity[3].swing
          )} at ±20%; NPV reaches zero at a ${pct(GROUND_TRUTH.breakEven.npvZeroDiscountRate)} discount rate.`
        : isCostDriver
          ? `Reaches the model through the operating expenditure and capital expenditure lines. Capex ranks ${GROUND_TRUTH.sensitivity[2].rank} (swing ${aed(
              GROUND_TRUTH.sensitivity[2].swing
            )}) and OpEx ranks ${GROUND_TRUTH.sensitivity[4].rank} (swing ${aed(
              GROUND_TRUTH.sensitivity[4].swing
            )}); the outlay may rise ${pct(
              GROUND_TRUTH.breakEven.outlayHeadroomPct,
              1
            )} before NPV reaches zero.`
          : `Reaches the model through the operating benefit line, which ranks ${GROUND_TRUTH.sensitivity[0].rank} in the sensitivity analysis with an NPV swing of ${aed(
              GROUND_TRUTH.sensitivity[0].swing
            )} at ±20% — the single largest exposure in the model. Benefits may fall ${pct(
              GROUND_TRUTH.breakEven.operatingBenefitShortfallPct,
              1
            )} before NPV reaches zero.`,
      directionOnNpv: (value === null
        ? 'Not determinable'
        : isRateDriver || isCostDriver
          ? 'Reduces NPV'
          : 'Ambiguous') as LiveMacroResult['drivers'][number]['directionOnNpv'],
    };
  });

  const missing = drivers.filter((d) => d.suppliedValue === null).map((d) => d.name);
  const unusedSupplied = supplied
    .filter((item) => !ctx.macroDrivers.some((d) => d.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])))
    .map((item) => item.name);

  const asOf = supplied.find((item) => item.asOf)?.asOf ?? null;

  return {
    ...archetypeStamp(key),
    dataProvenance: NO_LIVE_ACCESS_NOTICE,
    asOf: asOf,
    summary: `${supplied.length} macro input(s) were supplied for the ${ctx.label.toLowerCase()} archetype, of which ${
      drivers.length - missing.length
    } map to a driver that materially moves this archetype's cash flows. ${
      missing.length > 0
        ? `${missing.length} material driver(s) were not supplied and are listed under missingInputs; the analysis below is incomplete to that extent.`
        : 'All material drivers for this archetype were supplied.'
    } ${
      f.bothTestsPass
        ? `Against a base case of ${aed(f.npv)} NPV at ${f.irrText} IRR, the macro exposure that matters most is whichever driver reaches the operating benefit line — that variable alone carries an NPV swing of ${aed(
            GROUND_TRUTH.sensitivity[0].swing
          )}, larger than the entire headline NPV.`
        : `The base case already fails a value test (${verdictSentence(
            f
          ).toLowerCase()}), so adverse macro movement compounds an existing shortfall rather than eroding a surplus.`
    }`,
    drivers,
    missingInputs: [
      ...missing.map((m) => `${m} — material for this archetype but not supplied.`),
      ...(unusedSupplied.length > 0
        ? [
            `Supplied but not mapped to an archetype driver (retained without interpretation): ${unusedSupplied.join(', ')}.`,
          ]
        : []),
    ],
    caveats: [
      NO_LIVE_ACCESS_NOTICE,
      'No value above has been forecast, interpolated or extrapolated. Where a driver was not supplied the field reads null rather than a placeholder.',
      'Directional labels describe the sign of the effect on NPV, not its magnitude. Magnitude must come from re-running the deterministic engine with the revised assumption.',
      `${GROUND_TRUTH.entity} is a hypothetical entity used for academic capital-budgeting decision modelling.`,
    ],
  };
}

/* ================================================================== *
 * voice-intent
 * ================================================================== */

export const VoiceIntentSchema = z.object({
  intent: z.enum(['navigate', 'setScenario', 'setAssumption', 'runSimulation', 'unknown']),
  parameters: z.record(z.union([z.string(), z.number()])),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  clarificationPrompt: z.string().nullable(),
  transcriptEcho: z.string(),
});
export type VoiceIntentResult = z.infer<typeof VoiceIntentSchema>;

/** Confidence at or below this threshold resolves to `unknown`. */
export const VOICE_INTENT_CONFIDENCE_FLOOR = 0.55;

/** App routes reachable by voice. Values are paths; keys are spoken aliases. */
export const VOICE_ROUTE_ALIASES: Array<{ aliases: string[]; path: string; label: string }> = [
  { aliases: ['dashboard', 'home', 'overview'], path: '/dashboard', label: 'Executive Dashboard' },
  { aliases: ['financial model', 'model', 'cash flow', 'cashflow'], path: '/financial-model', label: 'Financial Model' },
  { aliases: ['assumption', 'assumptions', 'inputs'], path: '/assumptions', label: 'Assumptions' },
  { aliases: ['scenario', 'scenarios'], path: '/scenarios', label: 'Scenarios' },
  { aliases: ['sensitivity', 'tornado'], path: '/sensitivity', label: 'Sensitivity Analysis' },
  { aliases: ['monte carlo', 'simulation'], path: '/monte-carlo', label: 'Monte Carlo Simulation' },
  { aliases: ['real option', 'real options', 'options'], path: '/real-options', label: 'Real Options' },
  { aliases: ['portfolio'], path: '/portfolio', label: 'Capital Portfolio' },
  { aliases: ['funding', 'finance sources'], path: '/funding', label: 'Funding Analysis' },
  { aliases: ['approval', 'approvals', 'sign off'], path: '/approvals', label: 'Approvals' },
  { aliases: ['vendor', 'vendors', 'quotation'], path: '/vendor-analysis', label: 'Vendor Analysis' },
  { aliases: ['benefit', 'benefits tracker'], path: '/benefits-tracker', label: 'Benefits Tracker' },
  { aliases: ['scorecard', 'strategic'], path: '/strategic-scorecard', label: 'Strategic Scorecard' },
  { aliases: ['implementation', 'plan', 'roadmap'], path: '/implementation-plan', label: 'Implementation Plan' },
  { aliases: ['report', 'printable'], path: '/printable-report', label: 'Printable Report' },
  { aliases: ['presentation', 'slides', 'deck'], path: '/presentation', label: 'Board Presentation' },
  { aliases: ['ai assistant', 'assistant', 'chat'], path: '/ai-assistant', label: 'AI Assistant' },
  { aliases: ['ai studio', 'studio', 'advisory suite'], path: '/ai-studio', label: 'AI Studio' },
  { aliases: ['archetype', 'archetypes', 'project type'], path: '/archetypes', label: 'Project Archetypes' },
  { aliases: ['settings', 'preferences'], path: '/settings', label: 'Settings' },
  { aliases: ['data source', 'data sources'], path: '/data-sources', label: 'Data Sources' },
  { aliases: ['external data', 'macro'], path: '/external-data', label: 'External Data' },
];

const ASSUMPTION_ALIASES: Array<{ aliases: string[]; field: string; unit: 'percent' | 'years' | 'currency' }> = [
  { aliases: ['discount rate', 'wacc', 'hurdle rate', 'cost of capital'], field: 'discountRate', unit: 'percent' },
  { aliases: ['project life', 'life', 'horizon', 'appraisal period'], field: 'projectLifeYears', unit: 'years' },
  { aliases: ['capex', 'capital expenditure', 'initial investment', 'outlay'], field: 'initialCapitalExpenditure', unit: 'currency' },
  { aliases: ['working capital'], field: 'initialWorkingCapital', unit: 'currency' },
  { aliases: ['operating saving', 'operating savings', 'labour saving', 'labor saving', 'benefit', 'benefits'], field: 'year1OperatingSavings', unit: 'currency' },
  { aliases: ['contribution margin', 'margin'], field: 'year1ContributionMargin', unit: 'currency' },
  { aliases: ['opex', 'operating cost', 'operating expenditure'], field: 'year1OperatingCost', unit: 'currency' },
  { aliases: ['tax rate', 'corporate tax'], field: 'taxRate', unit: 'percent' },
];

const SCENARIO_ALIASES: Array<{ aliases: string[]; value: string }> = [
  { aliases: ['optimistic', 'best case', 'upside'], value: 'Optimistic' },
  { aliases: ['base', 'base case', 'central'], value: 'Base' },
  { aliases: ['pessimistic', 'worst case', 'downside', 'stress'], value: 'Pessimistic' },
  { aliases: ['custom', 'my scenario'], value: 'Custom' },
];

function extractNumber(text: string): { value: number; hadPercentSign: boolean } | null {
  const match = text.match(/(-?\d[\d,]*(?:\.\d+)?)\s*(%|per ?cent|percent)?/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  return { value, hadPercentSign: Boolean(match[2]) };
}

/**
 * Deterministic intent classifier for hands-free operation.
 *
 * Deliberately conservative: an utterance that does not clear
 * VOICE_INTENT_CONFIDENCE_FLOOR resolves to `unknown` with a clarification
 * prompt rather than an approximate action. Numeric values are echoed with
 * their spoken unit and are NOT converted — unit handling belongs to the
 * deterministic engine, not to the intent layer.
 */
export function buildVoiceIntentFallback(transcript: string): VoiceIntentResult {
  const text = transcript.toLowerCase().trim();
  const echo = transcript.slice(0, 400);

  const unknown = (reason: string, prompt: string): VoiceIntentResult => ({
    intent: 'unknown',
    parameters: {},
    confidence: 0.2,
    reasoning: reason,
    clarificationPrompt: prompt,
    transcriptEcho: echo,
  });

  if (text.length < 3) {
    return unknown(
      'The transcript was too short to classify.',
      'I did not catch that. Try "open the sensitivity page", "switch to the pessimistic scenario", "set the discount rate to 13 percent", or "run a Monte Carlo simulation".'
    );
  }

  // --- runSimulation -------------------------------------------------
  const wantsRun = /\b(run|start|execute|kick off|launch)\b/.test(text);
  if (wantsRun) {
    const simulationType = /monte ?carlo/.test(text)
      ? 'monteCarlo'
      : /sensitivity|tornado/.test(text)
        ? 'sensitivity'
        : /scenario/.test(text)
          ? 'scenarioSweep'
          : /break ?even/.test(text)
            ? 'breakEven'
            : null;

    if (simulationType) {
      const iterations = /\b(\d[\d,]*)\s*(iteration|trial|run|simulation)s?\b/.exec(text);
      const parameters: Record<string, string | number> = { simulation: simulationType };
      if (iterations) {
        const parsed = Number(iterations[1].replace(/,/g, ''));
        if (Number.isFinite(parsed)) parameters.iterations = parsed;
      }
      return {
        intent: 'runSimulation',
        parameters,
        confidence: iterations ? 0.9 : 0.85,
        reasoning: `An explicit run verb was present together with a named analysis ("${simulationType}"). The deterministic engine executes the run; this layer only routes the request.`,
        clarificationPrompt: null,
        transcriptEcho: echo,
      };
    }
    return unknown(
      'A run verb was detected but no named analysis was identified, so the target is ambiguous.',
      'Which analysis should I run — Monte Carlo, sensitivity, the scenario sweep, or break-even?'
    );
  }

  // --- setScenario ---------------------------------------------------
  const scenarioIntent = /\b(scenario|case|switch to|change to|set to|show)\b/.test(text);
  const scenarioMatch = SCENARIO_ALIASES.find((s) => s.aliases.some((a) => text.includes(a)));
  if (scenarioMatch && scenarioIntent) {
    return {
      intent: 'setScenario',
      parameters: { scenario: scenarioMatch.value },
      confidence: 0.9,
      reasoning: `A named scenario ("${scenarioMatch.value}") appeared together with a selection verb. Scenario selection changes which pre-computed result set is displayed; it triggers no new calculation in this layer.`,
      clarificationPrompt: null,
      transcriptEcho: echo,
    };
  }

  // --- setAssumption -------------------------------------------------
  const wantsSet = /\b(set|change|adjust|make|increase|decrease|raise|lower|move)\b/.test(text);
  const assumptionMatch = ASSUMPTION_ALIASES.find((a) => a.aliases.some((alias) => text.includes(alias)));
  if (wantsSet && assumptionMatch) {
    const numeric = extractNumber(text);
    if (!numeric) {
      return unknown(
        `The assumption "${assumptionMatch.field}" was identified but no numeric value was present, and an assumption change without a value cannot be executed safely.`,
        `What value should I set ${assumptionMatch.aliases[0]} to?`
      );
    }
    const unitConsistent =
      assumptionMatch.unit === 'percent' ? numeric.hadPercentSign || numeric.value <= 100 : true;

    // The spoken value is echoed with its unit and is NOT converted here.
    // Unit normalisation is the deterministic engine's responsibility.
    return {
      intent: 'setAssumption',
      parameters: {
        field: assumptionMatch.field,
        value: numeric.value,
        unit: assumptionMatch.unit,
        rawUnitSpoken: numeric.hadPercentSign ? 'percent' : 'none',
      },
      confidence: unitConsistent ? (numeric.hadPercentSign || assumptionMatch.unit !== 'percent' ? 0.85 : 0.7) : 0.5,
      reasoning: `A change verb was present with a known assumption field ("${assumptionMatch.field}") and a numeric value. The value is passed through unconverted in "${assumptionMatch.unit}" units; the deterministic engine normalises and re-runs the model.`,
      clarificationPrompt: unitConsistent
        ? null
        : `Did you mean ${numeric.value} percent, or ${numeric.value} as an absolute value? Please confirm before I change ${assumptionMatch.aliases[0]}.`,
      transcriptEcho: echo,
    };
  }

  // --- navigate ------------------------------------------------------
  const wantsNavigate = /\b(go to|open|show|navigate|take me|display|bring up|switch to)\b/.test(text);
  const routeMatch = VOICE_ROUTE_ALIASES.find((r) => r.aliases.some((a) => text.includes(a)));
  if (routeMatch && wantsNavigate) {
    return {
      intent: 'navigate',
      parameters: { path: routeMatch.path, label: routeMatch.label },
      confidence: 0.88,
      reasoning: `A navigation verb was present together with a known destination ("${routeMatch.label}").`,
      clarificationPrompt: null,
      transcriptEcho: echo,
    };
  }

  if (routeMatch && !wantsNavigate) {
    return unknown(
      `A page name ("${routeMatch.label}") was recognised but no verb indicated what to do with it. Acting on an ambiguous utterance risks changing state the speaker did not intend.`,
      `Did you want me to open ${routeMatch.label}?`
    );
  }

  if (assumptionMatch && !wantsSet) {
    return unknown(
      `An assumption name ("${assumptionMatch.field}") was recognised but no change verb or value was present.`,
      `Did you want to change ${assumptionMatch.aliases[0]}, or just see it? Say "set ${assumptionMatch.aliases[0]} to ..." to change it.`
    );
  }

  return unknown(
    'No supported intent was identified with sufficient confidence. Returning "unknown" rather than guessing an action that would change model state.',
    'I can navigate to a page, switch scenario, change an assumption, or run a simulation. For example: "open the sensitivity page", "switch to the pessimistic scenario", "set the discount rate to 13 percent", or "run a Monte Carlo simulation".'
  );
}
