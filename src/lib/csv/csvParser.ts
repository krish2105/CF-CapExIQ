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

/**
 * Load a CSV bundled in `public/`.
 *
 * The path is constrained to a same-origin absolute path. It was previously
 * passed to `fetch` unchecked, which made this a general-purpose fetcher for
 * any URL a caller supplied — the shape of an SSRF helper, sitting outside the
 * egress allowlist. Nothing calls it today, which is precisely why it was
 * worth constraining now rather than after something did.
 */
export async function fetchAndParseBundledCsv<T = Record<string, any>>(filePath: string): Promise<ParseCsvResult<T>> {
  if (!filePath.startsWith('/') || filePath.startsWith('//')) {
    throw new Error(
      `Refusing to load "${filePath}": only same-origin absolute paths under /public are allowed. ` +
        `This application does not retrieve third-party content — see src/lib/guardrails/egress.ts.`
    );
  }

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
