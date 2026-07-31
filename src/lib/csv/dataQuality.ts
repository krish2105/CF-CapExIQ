export interface RowValidationError {
  rowIndex: number;
  fieldName: string;
  errorMessage: string;
  rawRecord: Record<string, any>;
}

export interface DataQualityReport {
  datasetName: string;
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  missingValueCount: number;
  duplicateCount: number;
  dateRange?: { min: string; max: string };
  validationErrors: RowValidationError[];
}

export function computeDataQualityReport<T>(
  datasetName: string,
  rawRecords: Record<string, any>[],
  validator: (record: Record<string, any>) => { success: boolean; data?: T; error?: any },
  uniqueKeyField?: string,
  dateField?: string
): { validData: T[]; report: DataQualityReport } {
  let totalRows = rawRecords.length;
  let validRows = 0;
  let rejectedRows = 0;
  let missingValueCount = 0;

  const validData: T[] = [];
  const validationErrors: RowValidationError[] = [];
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  const dates: string[] = [];

  rawRecords.forEach((record, index) => {
    // Check missing value count
    for (const val of Object.values(record)) {
      if (val === undefined || val === null || String(val).trim() === '') {
        missingValueCount++;
      }
    }

    // Check unique key duplicates
    if (uniqueKeyField && record[uniqueKeyField] !== undefined) {
      const keyVal = String(record[uniqueKeyField]);
      if (seenKeys.has(keyVal)) {
        duplicateCount++;
      } else {
        seenKeys.add(keyVal);
      }
    }

    // Track dates
    if (dateField && record[dateField]) {
      dates.push(String(record[dateField]));
    }

    // Validate schema
    const result = validator(record);
    if (result.success && result.data) {
      validRows++;
      validData.push(result.data);
    } else {
      rejectedRows++;
      if (result.error && result.error.errors) {
        result.error.errors.forEach((err: any) => {
          validationErrors.push({
            rowIndex: index + 1,
            fieldName: err.path ? err.path.join('.') : 'unknown',
            errorMessage: err.message,
            rawRecord: record,
          });
        });
      } else {
        validationErrors.push({
          rowIndex: index + 1,
          fieldName: 'general',
          errorMessage: 'Row schema validation failed',
          rawRecord: record,
        });
      }
    }
  });

  let dateRange: { min: string; max: string } | undefined;
  if (dates.length > 0) {
    dates.sort();
    dateRange = { min: dates[0], max: dates[dates.length - 1] };
  }

  const report: DataQualityReport = {
    datasetName,
    totalRows,
    validRows,
    rejectedRows,
    missingValueCount,
    duplicateCount,
    dateRange,
    validationErrors,
  };

  return { validData, report };
}
