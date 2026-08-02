/**
 * Sanitizes input text to prevent CSV spreadsheet formula injection vulnerabilities.
 * Characters '=', '+', '-', '@' at the start of a field can trigger formula execution in Excel.
 */
export function sanitizeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);

  // If starts with formula triggers, prepend single quote to escape
  if (/^[=+\-@\t\r]/.test(stringValue)) {
    return `'${stringValue}`;
  }
  return stringValue;
}

export function sanitizeCsvRecord<T extends Record<string, any>>(record: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === 'string') {
      sanitized[key] = sanitizeCsvField(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized as T;
}
