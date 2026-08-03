import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import path from 'node:path';

/**
 * Minimal PDF text extraction.
 *
 * Chromium writes page content into FlateDecode streams; the visible strings
 * live inside Tj / TJ show-text operators. This inflates every stream and
 * pulls the literal strings out. It is not a general PDF parser — it is only
 * good enough to answer "does this document still contain 9.18".
 */
function extract(file) {
  const buf = readFileSync(file);
  let text = '';

  // Walk every `stream ... endstream` span and try to inflate it.
  let idx = 0;
  for (;;) {
    const s = buf.indexOf('stream', idx);
    if (s === -1) break;
    const e = buf.indexOf('endstream', s);
    if (e === -1) break;

    let start = s + 6;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;

    try {
      const inflated = inflateSync(buf.subarray(start, e)).toString('latin1');
      // (literal) Tj   and   [(a) -2 (b)] TJ
      for (const m of inflated.matchAll(/\(((?:\\.|[^\\()])*)\)/g)) {
        text += m[1].replace(/\\([()\\])/g, '$1') + ' ';
      }
    } catch {
      /* not a deflate stream — images, fonts */
    }
    idx = e + 9;
  }
  return text;
}

for (const f of [
  'CapExIQ_Board_Investment_Report.pdf',
  'CapExIQ_Complete_Project_Guide_and_QnA.pdf',
]) {
  const full = path.resolve('deliverables', f);
  const text = extract(full);
  const uniq = (re) => [...new Set(text.match(re) || [])].join('  ');

  console.log(`\n--- ${f} (${text.length} chars of text recovered) ---`);
  console.log('  STALE  9.18 / 4.68 / 15.42 :', uniq(/9\.18|4\.68|15\.42/g) || 'NONE');
  console.log('  CURRENT 12.08 / 26.3 / 19.3:', uniq(/12,083,628|12\.08|26\.3|19\.3/g) || 'none');
}
