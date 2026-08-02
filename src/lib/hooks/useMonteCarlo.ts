'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { runMonteCarloSimulation, type MonteCarloSummary } from '@/lib/finance/monteCarlo';
import type { FinancialAssumptions } from '@/lib/types/finance';
import type { MonteCarloRequest, MonteCarloResponse } from '@/lib/finance/monteCarlo.worker';

export interface UseMonteCarloResult {
  summary: MonteCarloSummary;
  /** True while a newer run is in flight; `summary` is the previous result. */
  isRunning: boolean;
  /** Wall time of the last completed worker run, or null before the first. */
  tookMs: number | null;
  /** False when Workers are unavailable and the run happened synchronously. */
  offThread: boolean;
}

/**
 * Runs the simulation in a Web Worker, keeping the previous result visible
 * while a new one computes.
 *
 * The first paint still needs *a* result, so a small synchronous run seeds the
 * UI and the worker immediately supersedes it at full iteration count. That
 * trade — 400 iterations of blocking work instead of 5,000 — keeps the page
 * from flashing empty charts without reintroducing a half-second stall.
 */
const SEED_ITERATIONS = 400;

export function useMonteCarlo(
  assumptions: FinancialAssumptions,
  iterations: number,
  seed: number
): UseMonteCarloResult {
  // Cheap synchronous seed so charts have shape on first paint.
  const seedSummary = useMemo(
    () => runMonteCarloSimulation(assumptions, { iterations: SEED_ITERATIONS, seed }),
    [assumptions, seed]
  );

  const [summary, setSummary] = useState<MonteCarloSummary>(seedSummary);
  const [isRunning, setIsRunning] = useState(false);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [offThread, setOffThread] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setOffThread(false);
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL('../finance/monteCarlo.worker.ts', import.meta.url));
    } catch {
      setOffThread(false);
      return;
    }
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<MonteCarloResponse>) => {
      // Ignore results from a run the user has already moved past.
      if (event.data.runId !== runIdRef.current) return;
      setSummary(event.data.summary);
      setTookMs(event.data.tookMs);
      setIsRunning(false);
    };
    worker.onerror = () => {
      setOffThread(false);
      setIsRunning(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) {
      // No worker: fall back to computing on the main thread at full count,
      // which is the pre-existing behaviour rather than a new regression.
      setSummary(runMonteCarloSimulation(assumptions, { iterations, seed }));
      return;
    }
    const runId = ++runIdRef.current;
    setIsRunning(true);
    const request: MonteCarloRequest = { runId, assumptions, iterations, seed };
    worker.postMessage(request);
  }, [assumptions, iterations, seed, offThread]);

  return { summary, isRunning, tookMs, offThread };
}
