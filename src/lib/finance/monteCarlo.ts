import { FinancialAssumptions } from '../types/finance';
import { calculateFinancialMetrics } from './metrics';

export type DistributionType = 'Fixed' | 'Triangular' | 'Normal' | 'Uniform';

export interface DistributionParam {
  type: DistributionType;
  base: number;
  min?: number;
  max?: number;
  mode?: number;
  stdDev?: number;
}

export interface MonteCarloConfig {
  iterations: number; // default 5000
  seed: number; // default 12345
  capexDist: DistributionParam;
  savingsDist: DistributionParam;
  opexDist: DistributionParam;
  waccDist: DistributionParam;
}

export interface MonteCarloSummary {
  iterations: number;
  meanNpv: number;
  medianNpv: number;
  stdDevNpv: number;
  p10Npv: number;
  p50Npv: number;
  p90Npv: number;
  probNegativeNpvPct: number;
  probIrrAboveWaccPct: number;
  probPaybackUnderTargetPct: number;
  histogramData: { binLabel: string; binMin: number; binMax: number; count: number; frequencyPct: number }[];
  cumulativeCurveData: { npv: number; probLessOrEqualPct: number }[];
}

// Seeded PRNG: Mulberry32 algorithm
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample from distribution
function sampleDistribution(param: DistributionParam, random: () => number): number {
  const { type, base, min = base * 0.8, max = base * 1.2, mode = base, stdDev = base * 0.1 } = param;

  switch (type) {
    case 'Fixed':
      return base;
    case 'Uniform':
      return min + random() * (max - min);
    case 'Triangular': {
      const u = random();
      const F = (mode - min) / (max - min);
      if (u < F) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
      } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
      }
    }
    case 'Normal': {
      // Box-Muller transform
      const u1 = random() || 1e-10;
      const u2 = random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const val = base + z0 * stdDev;
      return Math.max(min, Math.min(max, val));
    }
  }
}

export function runMonteCarloSimulation(
  baseAssumptions: FinancialAssumptions,
  config?: Partial<MonteCarloConfig>
): MonteCarloSummary {
  const iterations = config?.iterations || 5000;
  const seed = config?.seed || 12345;
  const random = mulberry32(seed);

  const totalBaseCapex =
    baseAssumptions.automationEquipment +
    baseAssumptions.installationIntegration +
    baseAssumptions.softwareCybersecurity +
    baseAssumptions.trainingLaunch;

  const capexDist: DistributionParam = config?.capexDist || {
    type: 'Triangular',
    base: totalBaseCapex,
    min: totalBaseCapex * 0.9,
    mode: totalBaseCapex,
    max: totalBaseCapex * 1.25,
  };

  const savingsDist: DistributionParam = config?.savingsDist || {
    type: 'Normal',
    base: baseAssumptions.year1OperatingSavings,
    stdDev: baseAssumptions.year1OperatingSavings * 0.1,
    min: baseAssumptions.year1OperatingSavings * 0.7,
    max: baseAssumptions.year1OperatingSavings * 1.3,
  };

  const opexDist: DistributionParam = config?.opexDist || {
    type: 'Triangular',
    base: baseAssumptions.year1AdditionalOpEx,
    min: baseAssumptions.year1AdditionalOpEx * 0.9,
    mode: baseAssumptions.year1AdditionalOpEx,
    max: baseAssumptions.year1AdditionalOpEx * 1.3,
  };

  const waccDist: DistributionParam = config?.waccDist || {
    type: 'Normal',
    base: baseAssumptions.discountRate,
    stdDev: 0.01,
    min: 0.08,
    max: 0.16,
  };

  const npvs: number[] = [];
  let negativeNpvCount = 0;
  let irrAboveWaccCount = 0;
  let paybackUnderTargetCount = 0;

  for (let i = 0; i < iterations; i++) {
    const sampledCapex = sampleDistribution(capexDist, random);
    const capexRatio = sampledCapex / totalBaseCapex;

    const sampledSavings = sampleDistribution(savingsDist, random);
    const sampledOpEx = sampleDistribution(opexDist, random);
    const sampledWacc = sampleDistribution(waccDist, random);

    const testAssumptions: FinancialAssumptions = {
      ...baseAssumptions,
      automationEquipment: baseAssumptions.automationEquipment * capexRatio,
      installationIntegration: baseAssumptions.installationIntegration * capexRatio,
      softwareCybersecurity: baseAssumptions.softwareCybersecurity * capexRatio,
      trainingLaunch: baseAssumptions.trainingLaunch * capexRatio,
      year1OperatingSavings: sampledSavings,
      year1AdditionalOpEx: sampledOpEx,
      discountRate: sampledWacc,
      financeRateMIRR: sampledWacc,
      reinvestmentRateMIRR: sampledWacc,
    };

    const metrics = calculateFinancialMetrics(testAssumptions);
    npvs.push(metrics.npv);

    if (metrics.npv < 0) negativeNpvCount++;
    if (metrics.irr !== null && metrics.irr >= sampledWacc) irrAboveWaccCount++;
    if (metrics.paybackPeriodYears !== null && metrics.paybackPeriodYears <= 4.5) paybackUnderTargetCount++;
  }

  // Sort NPVs for percentile computation
  npvs.sort((a, b) => a - b);

  const meanNpv = npvs.reduce((sum, v) => sum + v, 0) / iterations;
  const medianNpv = npvs[Math.floor(iterations * 0.5)];
  const p10Npv = npvs[Math.floor(iterations * 0.1)];
  const p50Npv = medianNpv;
  const p90Npv = npvs[Math.floor(iterations * 0.9)];

  const variance = npvs.reduce((sum, v) => sum + Math.pow(v - meanNpv, 2), 0) / iterations;
  const stdDevNpv = Math.sqrt(variance);

  // Build Histogram Bins (12 bins)
  const minNpv = npvs[0];
  const maxNpv = npvs[iterations - 1];
  const binWidth = (maxNpv - minNpv) / 12;

  const histogramBins = Array.from({ length: 12 }, (_, bIdx) => {
    const binMin = minNpv + bIdx * binWidth;
    const binMax = binMin + binWidth;
    const count = npvs.filter((v) => v >= binMin && (bIdx === 11 ? v <= binMax : v < binMax)).length;
    return {
      binLabel: `${(binMin / 1000000).toFixed(1)}M`,
      binMin,
      binMax,
      count,
      frequencyPct: (count / iterations) * 100,
    };
  });

  // Build Cumulative S-Curve Data (20 points)
  const cumulativeCurveData = Array.from({ length: 20 }, (_, pIdx) => {
    const targetIdx = Math.floor((pIdx / 19) * (iterations - 1));
    const targetNpv = npvs[targetIdx];
    return {
      npv: targetNpv / 1000000,
      probLessOrEqualPct: ((targetIdx + 1) / iterations) * 100,
    };
  });

  return {
    iterations,
    meanNpv,
    medianNpv,
    stdDevNpv,
    p10Npv,
    p50Npv,
    p90Npv,
    probNegativeNpvPct: (negativeNpvCount / iterations) * 100,
    probIrrAboveWaccPct: (irrAboveWaccCount / iterations) * 100,
    probPaybackUnderTargetPct: (paybackUnderTargetCount / iterations) * 100,
    histogramData: histogramBins,
    cumulativeCurveData,
  };
}
