import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  parseModelOutput,
  parseModelContext,
  BoardDebateSchema,
  ParsedQuoteSchema,
  VoiceIntentSchema,
  RecommendSchema,
} from '@/lib/ai/schemas';

const validDebate = {
  consensusDecision: 'APPROVE WITH GATES',
  consensusSummary: 'Board approved with stage gates.',
  voteCount: { approve: 2, conditional: 2, defer: 0, reject: 0 },
  statements: [
    {
      role: 'CFO',
      title: 'Chief Financial Officer',
      name: 'Tariq Al-Mansoor',
      avatar: '👔',
      verdict: 'APPROVE',
      statement: 'NPV clears the hurdle rate.',
      keyConcernOrDriver: 'Strong coverage.',
    },
  ],
  stageGates: ['Gate 1: vendor contract execution.'],
  disclaimer: 'Simulation.',
};

describe('model output validation', () => {
  it('accepts a well-formed completion', () => {
    const outcome = parseModelOutput(BoardDebateSchema, JSON.stringify(validDebate));
    expect(outcome.ok).toBe(true);
  });

  it('rejects non-JSON rather than throwing', () => {
    const outcome = parseModelOutput(BoardDebateSchema, 'Sure! Here is your debate:');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.issue).toMatch(/not valid JSON/i);
  });

  it('rejects a completion missing a required field, and names it', () => {
    const broken: any = structuredClone(validDebate);
    delete broken.voteCount.reject;
    const outcome = parseModelOutput(BoardDebateSchema, JSON.stringify(broken));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.issue).toMatch(/voteCount\.reject/);
  });

  it('rejects a hallucinated enum value', () => {
    const broken = { ...validDebate, consensusDecision: 'APPROVE ENTHUSIASTICALLY' };
    expect(parseModelOutput(BoardDebateSchema, JSON.stringify(broken)).ok).toBe(false);
  });

  it('rejects a string where a number belongs', () => {
    const broken: any = structuredClone(validDebate);
    broken.voteCount.approve = 'two';
    expect(parseModelOutput(BoardDebateSchema, JSON.stringify(broken)).ok).toBe(false);
  });

  /**
   * The write paths. These two responses change the capital model, so a
   * malformed or absurd value is a financial error, not a rendering one.
   */
  it('rejects a negative CapEx line from a quote extraction', () => {
    const quote = {
      vendorName: 'Dematic',
      quotationRef: 'Q-1',
      quoteDate: '2026-07-15',
      currency: 'AED',
      extractedCapEx: {
        automationEquipment: -5_000_000,
        installationIntegration: 0,
        softwareCybersecurity: 0,
        trainingLaunch: 0,
        totalCapEx: 0,
      },
      itemizedBreakdown: [],
      vendorNotes: '',
    };
    expect(parseModelOutput(ParsedQuoteSchema, JSON.stringify(quote)).ok).toBe(false);
  });

  it('rejects an out-of-range discount rate from a voice command', () => {
    const intent = {
      spokenSummary: 'Set the discount rate.',
      actionTaken: 'Updated WACC.',
      proposedUpdates: { discountRate: 45 }, // 4500%, not 45%
    };
    expect(parseModelOutput(VoiceIntentSchema, JSON.stringify(intent)).ok).toBe(false);
  });

  it('accepts a plausible voice update', () => {
    const intent = {
      spokenSummary: 'Set the discount rate to 12 percent.',
      actionTaken: 'Updated WACC to 12.0%.',
      proposedUpdates: { discountRate: 0.12 },
    };
    expect(parseModelOutput(VoiceIntentSchema, JSON.stringify(intent)).ok).toBe(true);
  });

  it('rejects an empty recommendation list rather than rendering a blank panel', () => {
    const rec = {
      decision: 'Approve',
      executiveSummary: 'Fine.',
      keyValueDrivers: [],
      principalRisks: ['One'],
      managementControls: ['Two'],
      confidence: 'High',
      disclaimer: 'Advisory.',
    };
    expect(parseModelOutput(RecommendSchema, JSON.stringify(rec)).ok).toBe(false);
  });
});

describe('request context validation', () => {
  it('keeps well-typed figures', () => {
    const ctx = parseModelContext({ metrics: { npv: 12_080_000, irr: 0.263 } });
    expect(ctx.metrics?.npv).toBe(12_080_000);
  });

  it('drops a hostile payload instead of letting it reach arithmetic', () => {
    // `(irr * 100).toFixed(2)` on a string yields "NaN%" on a board paper.
    const ctx = parseModelContext({ metrics: { irr: 'not-a-number' } });
    expect(ctx.metrics).toBeUndefined();
  });

  it('rejects a non-finite figure', () => {
    const ctx = parseModelContext({ metrics: { npv: Number.POSITIVE_INFINITY } });
    expect(ctx.metrics).toBeUndefined();
  });

  it('tolerates an unknown field rather than failing the request', () => {
    const ctx = parseModelContext({ metrics: { npv: 1, futureField: 'x' } });
    expect(ctx.metrics?.npv).toBe(1);
  });

  it('degrades to an empty context on junk input', () => {
    expect(parseModelContext('not an object')).toEqual({});
    expect(parseModelContext(null)).toEqual({});
  });
});

/**
 * Structural guard: a raw cast on a completion is the exact defect this
 * module exists to remove, and it compiles perfectly well.
 */
describe('no unvalidated completions', () => {
  const AI = path.resolve(__dirname, '../src/app/api/ai');
  const routes = readdirSync(AI)
    .filter((e) => statSync(path.join(AI, e)).isDirectory())
    .map((e) => ({ name: e, file: path.join(AI, e, 'route.ts') }));

  it.each(routes)('$name casts no completion straight to a type', ({ file }) => {
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(source).not.toMatch(/JSON\.parse\(content\)\s+as\s/);
  });
});
