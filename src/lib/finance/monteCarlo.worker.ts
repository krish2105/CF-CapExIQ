/// <reference lib="webworker" />
import { runMonteCarloSimulation, type MonteCarloSummary } from './monteCarlo';
import type { FinancialAssumptions } from '../types/finance';

/**
 * Monte Carlo runs off the main thread.
 *
 * Measured on the default corpus: 5,000 iterations is 526ms and 25,000 is
 * 2.64s of straight-line synchronous work. Executed during render that is a
 * fully frozen tab — no scroll, no theme toggle, no navigation — every time
 * the assumptions or the seed change. The maths is unchanged; it just runs
 * somewhere that isn't the UI thread.
 */

export interface MonteCarloRequest {
  runId: number;
  assumptions: FinancialAssumptions;
  iterations: number;
  seed: number;
}

export interface MonteCarloResponse {
  runId: number;
  summary: MonteCarloSummary;
  tookMs: number;
}

self.onmessage = (event: MessageEvent<MonteCarloRequest>) => {
  const { runId, assumptions, iterations, seed } = event.data;
  const started = performance.now();
  const summary = runMonteCarloSimulation(assumptions, { iterations, seed });
  const message: MonteCarloResponse = { runId, summary, tookMs: performance.now() - started };
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

export {};
