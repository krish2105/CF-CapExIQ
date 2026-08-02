import type { FinancialAssumptions } from '../types/finance';

/**
 * Cash-flow forecasting with uncertainty bands.
 *
 * The model previously projected benefits with a single compound growth rate:
 * `year1 * (1 + g)^(t-1)`. That is a projection, not a forecast — it states one
 * path with no expression of how wrong it might be, and nothing about it is
 * fitted to anything. A committee reading it cannot tell whether the Year-4
 * number is confident or a guess.
 *
 * This module fits the growth rate to an observed series by ordinary least
 * squares on log values, and carries the regression's own standard error
 * forward into P10/P50/P90 bands. The width of the band is therefore derived
 * from how well the trend actually fits the history — a noisy series produces
 * visibly wider bands rather than the same smooth curve.
 *
 * WHAT THIS IS NOT
 * It is a log-linear trend fit, not a time-series model. It has no seasonality
 * term, no autocorrelation structure, and no exogenous drivers, so it should
 * not be used to forecast anything with a seasonal or cyclical shape. With
 * fewer than four observations it declines to fit and says so rather than
 * returning a confident line through two points.
 */

/** Normal quantiles for the reported bands. */
const Z_P10 = -1.2815515655446004;
const Z_P90 = 1.2815515655446004;

const MIN_OBSERVATIONS = 4;

export interface ForecastPoint {
  year: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface GrowthFit {
  /** Fitted compound annual growth rate. */
  annualGrowth: number;
  /** Residual standard error of the log-linear fit, in log space. */
  logStdError: number;
  /** Coefficient of determination, 0-1. */
  rSquared: number;
  observations: number;
}

export interface ForecastResult {
  fit: GrowthFit | null;
  points: ForecastPoint[];
  /** Present when no fit was possible; explains why in plain language. */
  declinedReason?: string;
  /**
   * Growth rate the model is currently assuming, for comparison against the
   * fitted rate. A large gap is the interesting signal.
   */
  assumedGrowth: number;
}

/**
 * Fit a compound growth rate to a positive series by least squares on logs.
 * Returns null when the series is too short or contains non-positive values,
 * because a log fit is undefined for those and silently dropping the offending
 * points would misrepresent the sample size.
 */
export function fitGrowth(series: number[]): GrowthFit | null {
  const clean = series.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length < MIN_OBSERVATIONS || clean.length !== series.length) return null;

  const n = clean.length;
  const xs = clean.map((_, i) => i);
  const ys = clean.map((v) => Math.log(v));

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) ** 2;
  }
  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  // n-2 degrees of freedom: the fit consumes a slope and an intercept.
  const logStdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return {
    annualGrowth: Math.exp(slope) - 1,
    logStdError,
    rSquared: ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot),
    observations: n,
  };
}

/**
 * Forecast the operating-savings line with uncertainty bands.
 *
 * Band width grows with the square root of the horizon, which is the standard
 * random-walk widening: uncertainty about year five is not the same as
 * uncertainty about year one, and a constant band would imply it is.
 */
export function forecastOperatingSavings(
  assumptions: FinancialAssumptions,
  observedSeries: number[]
): ForecastResult {
  const assumedGrowth = assumptions.annualSavingsGrowth;
  const fit = fitGrowth(observedSeries);

  if (!fit) {
    return {
      fit: null,
      points: [],
      assumedGrowth,
      declinedReason:
        `A trend was not fitted. At least ${MIN_OBSERVATIONS} strictly positive observations are ` +
        `required, and the supplied series has ${observedSeries.length}. The model continues to use ` +
        `the assumed growth rate of ${(assumedGrowth * 100).toFixed(1)}%, which is a management ` +
        `estimate rather than a fitted value.`,
    };
  }

  const base = assumptions.year1OperatingSavings;
  const points: ForecastPoint[] = [];

  for (let year = 1; year <= assumptions.projectLifeYears; year++) {
    const median = base * Math.pow(1 + fit.annualGrowth, year - 1);
    const spread = fit.logStdError * Math.sqrt(year);
    points.push({
      year,
      p10: median * Math.exp(Z_P10 * spread),
      p50: median,
      p90: median * Math.exp(Z_P90 * spread),
    });
  }

  return { fit, points, assumedGrowth };
}
