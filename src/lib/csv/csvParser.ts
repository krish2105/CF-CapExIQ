import Papa from 'papaparse';
import { sanitizeCsvRecord } from './sanitizer';

export interface ParseCsvResult<T> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

export function parseCsvString<T = Record<string, any>>(csvString: string): ParseCsvResult<T> {
  const parsed = Papa.parse<Record<string, any>>(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const sanitizedData = parsed.data.map((row) => sanitizeCsvRecord(row)) as T[];

  return {
    data: sanitizedData,
    errors: parsed.errors,
    meta: parsed.meta,
  };
}

export async function fetchAndParseBundledCsv<T = Record<string, any>>(filePath: string): Promise<ParseCsvResult<T>> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV file from ${filePath}: ${response.statusText}`);
    }
    const text = await response.text();
    return parseCsvString<T>(text);
  } catch (error) {
    console.error(`Error loading bundled CSV (${filePath}):`, error);
    return { data: [], errors: [], meta: { delimiter: ',', linebreak: '\n', aborted: false, truncated: false, cursor: 0 } };
  }
}
