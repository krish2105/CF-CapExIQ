import { describe, it, expect } from 'vitest';
import { calculateOneWaySensitivity, calculateTwoWaySensitivity, generateTornadoChartData } from '../src/lib/finance/sensitivity';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

describe('Sensitivity Engine', () => {
  it('generates 1-way sensitivity results for all 7 key parameters', () => {
    const results = calculateOneWaySensitivity(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(results.length).toBe(7);
    results.forEach((item) => {
      expect(item.points.length).toBe(5);
      expect(item.npvImpactRange).toBeGreaterThan(0);
    });
  });

  it('generates 2-way sensitivity matrices correctly', () => {
    const { rateVsBenefitMatrix, capexVsBenefitMatrix } = calculateTwoWaySensitivity(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(rateVsBenefitMatrix.rowValues.length).toBe(5);
    expect(rateVsBenefitMatrix.colValues.length).toBe(5);
    expect(rateVsBenefitMatrix.matrix.length).toBe(5);
    expect(rateVsBenefitMatrix.matrix[0].length).toBe(5);

    expect(capexVsBenefitMatrix.matrix.length).toBe(5);
  });

  it('ranks sensitivity parameters in Tornado chart data by impact magnitude', () => {
    const tornadoData = generateTornadoChartData(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(tornadoData.length).toBe(7);
    // Tornado data must be sorted descending by spread
    for (let i = 0; i < tornadoData.length - 1; i++) {
      expect(tornadoData[i].spread).toBeGreaterThanOrEqual(tornadoData[i + 1].spread);
    }
  });
});
