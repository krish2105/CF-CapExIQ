import { describe, it, expect } from 'vitest';
import { sanitizeCsvField, sanitizeCsvRecord } from '../src/lib/csv/sanitizer';
import { parseCsvString } from '../src/lib/csv/csvParser';
import { computeDataQualityReport } from '../src/lib/csv/dataQuality';
import { projectAssumptionRowSchema } from '../src/lib/csv/schemas';

describe('CSV Parser & Sanitizer Layer', () => {
  it('sanitizes formula injection triggers (=, +, -, @)', () => {
    expect(sanitizeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvField('+12345')).toBe("'+12345");
    expect(sanitizeCsvField('-CMD|/C calc!A0')).toBe("'-CMD|/C calc!A0");
    expect(sanitizeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(sanitizeCsvField('Normal Text')).toBe('Normal Text');
  });

  it('parses CSV string with quoted fields and numbers correctly', () => {
    const rawCsv = `assumption_id,category,name,value\nCAPEX-1,"Capital expenditure",Automation,18000000\nCAPEX-2,"Software & Cyber",Licences,1200000`;
    const result = parseCsvString(rawCsv);

    expect(result.data.length).toBe(2);
    expect(result.data[0].category).toBe('Capital expenditure');
    expect(result.data[0].value).toBe(18000000);
  });

  it('computes data quality report with valid and invalid row tracking', () => {
    const mockRecords = [
      { assumption_id: 'C1', category: 'Capex', assumption_name: 'Equip', value: 1000, unit: 'AED', data_classification: 'Forecast', source_type: 'Estimate' },
      { assumption_id: 'C2', category: 'Capex', assumption_name: 'Invalid', value: 'NOT_A_NUMBER', unit: 'AED', data_classification: 'Forecast', source_type: 'Estimate' },
    ];

    const { validData, report } = computeDataQualityReport(
      'TestDataset',
      mockRecords,
      (record) => {
        const res = projectAssumptionRowSchema.safeParse(record);
        return { success: res.success, data: res.data, error: res.error };
      },
      'assumption_id'
    );

    expect(report.totalRows).toBe(2);
    expect(report.validRows).toBe(1);
    expect(report.rejectedRows).toBe(1);
    expect(report.validationErrors.length).toBeGreaterThan(0);
  });
});
