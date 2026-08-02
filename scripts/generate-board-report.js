/**
 * generate-board-report.js
 * ------------------------------------------------------------------
 * Regenerates CapExIQ_Board_Investment_Report.pdf in the REPOSITORY ROOT.
 *
 * Companion to scripts/generate-pdf.js (the Project Guide & Q&A handbook);
 * the two documents deliberately share a design language so they read as a
 * matched set: dark-navy banner, JetBrains Mono stat cards, navy table
 * headers, A4 with 15mm side margins.
 *
 * SOURCE OF TRUTH: every figure below is transcribed from the deterministic
 * TypeScript capital-budgeting engine (Topic 9 — AI Capital-Budgeting
 * Dashboard, NovaRetail GCC base case). The previous root PDF was produced
 * ad hoc and its Section 6 schedule was a 5-year table with AED 4.4M/yr
 * depreciation that discounted to AED 7.89M, contradicting the AED 12,083,628
 * NPV headlined by the same document. This script exists so that schedule can
 * never drift again: the 6-year table is held as data and rendered, not typed.
 *
 * Run: node scripts/generate-board-report.js   (or: npm run report:board)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

// ------------------------------------------------------------------
// Formatting helpers. Thousands separators everywhere; negatives in
// parentheses, per board-memorandum convention.
// ------------------------------------------------------------------
function group(n) {
  const parts = String(n).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/** Currency cell. null renders as an em dash. */
function aed(v) {
  if (v === null || v === undefined) return '&mdash;';
  const r = Math.round(v);
  return r < 0 ? '(' + group(Math.abs(r)) + ')' : group(r);
}

/** Discount-factor cell, fixed 4 decimals. */
function factor(v) {
  if (v === null || v === undefined) return '&mdash;';
  return v.toFixed(4);
}

// ------------------------------------------------------------------
// SECTION 6 DATA — the 6-year free-cash-flow schedule.
// Life 6 years. CapEx AED 22.0M + working capital AED 2.0M = AED 24.0M
// outlay. Depreciation is straight-line TO SALVAGE:
//   (22,000,000 - 2,000,000) / 6 = AED 3,333,333 per year.
// Columns are Year 0 .. Year 6.
// ------------------------------------------------------------------
const SCHEDULE = [
  { label: 'Operating savings',        kind: 'aed', v: [null, 7500000, 7800000, 8112000, 8436480, 8773939, 9124897] },
  { label: 'Contribution margin',      kind: 'aed', v: [null, 2500000, 2625000, 2756250, 2894063, 3038766, 3190704] },
  { label: 'Total benefits',           kind: 'aed', v: [null, 10000000, 10425000, 10868250, 11330543, 11812705, 12315601], sub: true },
  { label: 'Less: operating expenses', kind: 'aed', v: [null, -2200000, -2266000, -2333980, -2403999, -2476119, -2550403] },
  { label: 'EBITDA',                   kind: 'aed', v: [null, 7800000, 8159000, 8534270, 8926543, 9336585, 9765198], sub: true },
  { label: 'Less: depreciation',       kind: 'aed', v: [null, -3333333, -3333333, -3333333, -3333333, -3333333, -3333333] },
  { label: 'EBIT',                     kind: 'aed', v: [null, 4466667, 4825667, 5200937, 5593210, 6003252, 6431864], sub: true },
  { label: 'Less: tax @ 9%',           kind: 'aed', v: [null, -402000, -434310, -468084, -503389, -540293, -578868] },
  { label: 'NOPAT',                    kind: 'aed', v: [null, 4064667, 4391357, 4732852, 5089821, 5462959, 5852997], sub: true },
  { label: 'Add back: depreciation',   kind: 'aed', v: [null, 3333333, 3333333, 3333333, 3333333, 3333333, 3333333] },
  { label: 'Operating cash flow',      kind: 'aed', v: [null, 7398000, 7724690, 8066186, 8423154, 8796293, 9186330], sub: true },
  { label: 'Salvage value',            kind: 'aed', v: [null, null, null, null, null, null, 2000000] },
  { label: 'Working capital recovery', kind: 'aed', v: [null, null, null, null, null, null, 2000000] },
  { label: 'Initial outlay',           kind: 'aed', v: [-24000000, null, null, null, null, null, null] },
  { label: 'Free cash flow',           kind: 'aed', v: [-24000000, 7398000, 7724690, 8066186, 8423154, 8796293, 13186330], total: true },
  { label: 'Discount factor @ 11.50%', kind: 'factor', v: [1.0000, 0.8969, 0.8044, 0.7214, 0.6470, 0.5803, 0.5204] },
  { label: 'Present value of FCF',     kind: 'aed', v: [-24000000, 6634978, 6213429, 5818936, 5449734, 5104172, 6862380], total: true },
  { label: 'Cumulative FCF',           kind: 'aed', v: [-24000000, -16602000, -8877310, -811124, 7612030, 16408323, 29594653] },
  { label: 'Cumulative discounted FCF', kind: 'aed', v: [-24000000, -17365022, -11151594, -5332657, 117077, 5221249, 12083628], total: true },
];

function scheduleRows() {
  return SCHEDULE.map((row) => {
    const cls = row.total ? ' class="row-total"' : row.sub ? ' class="row-sub"' : '';
    const cells = row.v
      .map((val) => {
        const txt = row.kind === 'factor' ? factor(val) : aed(val);
        const neg = typeof val === 'number' && val < 0 ? ' neg' : '';
        return '<td class="num' + neg + '">' + txt + '</td>';
      })
      .join('');
    return '<tr' + cls + '><td class="line">' + row.label + '</td>' + cells + '</tr>';
  }).join('\n      ');
}

const REPORT_DATE = new Date().toLocaleDateString('en-GB', {
  day: '2-digit', month: 'long', year: 'numeric',
});

async function generateBoardReport() {
  // Output lands in the REPOSITORY ROOT, not deliverables/. Resolved from
  // __dirname rather than process.cwd() so the destination is the same no
  // matter which directory the script is invoked from.
  const repoRoot = path.resolve(__dirname, '..');
  const pdfPath = path.join(repoRoot, 'CapExIQ_Board_Investment_Report.pdf');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CapExIQ — Board Investment Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
    }

    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .header-banner h1 {
      margin: 0 0 6px 0;
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #38bdf8;
    }

    .header-banner .subtitle {
      font-size: 11pt;
      color: #cbd5e1;
      margin-bottom: 4px;
    }

    .header-banner .meta {
      font-size: 9.5pt;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    .badge-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
    }

    .badge {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
    }

    .badge.approve {
      background: rgba(34, 197, 94, 0.15);
      color: #16a34a;
      border-color: rgba(34, 197, 94, 0.35);
    }

    h2 {
      font-size: 13.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 22px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #0284c7;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 20px;
    }

    li {
      margin-bottom: 5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 14px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 7px 9px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    td.num, th.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
    }

    td.neg {
      color: #b91c1c;
    }

    /* --- Section 6 cash-flow schedule --- */
    table.schedule {
      font-size: 7.4pt;
      page-break-inside: avoid;
    }

    table.schedule th {
      padding: 6px 4px;
      font-size: 7.4pt;
      text-align: right;
    }

    table.schedule th:first-child {
      text-align: left;
    }

    table.schedule td {
      padding: 4px 4px;
    }

    table.schedule td.line {
      text-align: left;
      font-weight: 500;
      white-space: nowrap;
    }

    table.schedule tr.row-sub td {
      background-color: #eef2f7;
      font-weight: 700;
    }

    table.schedule tr.row-total td {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      border-color: #1e293b;
    }

    table.schedule tr.row-total td.neg {
      color: #fca5a5;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .stat-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 12px 10px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-card .label {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .stat-card .val {
      font-size: 14pt;
      font-weight: 800;
      color: #0369a1;
      margin: 5px 0;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-card .sub {
      font-size: 7.5pt;
      color: #475569;
    }

    .highlight-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    .approve-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-left: 5px solid #16a34a;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    .caution-box {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-left: 5px solid #ea580c;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    .notice {
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 14px;
    }

    .formula {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      border-left: 3px solid #0284c7;
      padding: 7px 10px;
      margin: 6px 0 10px 0;
      border-radius: 4px;
      white-space: pre-wrap;
    }

    .pass { color: #15803d; font-weight: 700; }
    .fail { color: #b91c1c; font-weight: 700; }

    .page-break {
      page-break-before: always;
    }

    .cover-spacer { height: 18mm; }

    .cover-block {
      border-top: 3px solid #0f172a;
      padding-top: 14px;
      margin-top: 18px;
      font-size: 9.5pt;
      color: #334155;
    }

    .sign-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 18px;
      page-break-inside: avoid;
    }

    .sign-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      font-size: 8.5pt;
    }

    .sign-card .role {
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.4px;
    }

    .sign-card .rule {
      border-bottom: 1px solid #94a3b8;
      height: 26px;
      margin: 14px 0 4px 0;
    }

    .sign-card .cap {
      color: #64748b;
      font-size: 7.5pt;
    }

    .footer-text {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 26px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }

    .fn {
      font-size: 8pt;
      color: #64748b;
      margin-top: -6px;
      margin-bottom: 14px;
    }
  </style>
</head>
<body>

  <!-- ================= COVER ================= -->
  <div class="header-banner">
    <h1>Board Investment Report</h1>
    <div class="subtitle">Automated Micro-Fulfilment Centre &mdash; Dubai, United Arab Emirates</div>
    <div class="meta">Topic 9 &mdash; AI Capital-Budgeting Dashboard &nbsp;|&nbsp; Prepared for the Capital Expenditure Committee, NovaRetail GCC &nbsp;|&nbsp; ${REPORT_DATE}</div>
    <div class="badge-strip">
      <span class="badge">Entity: NovaRetail GCC</span>
      <span class="badge">Horizon: 6-Year DCF</span>
      <span class="badge">WACC: 11.50%</span>
      <span class="badge">Tax: UAE 9%</span>
      <span class="badge approve">Recommendation: APPROVE</span>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">Total Capital Outlay</div>
      <div class="val">AED 24.00M</div>
      <div class="sub">CapEx 22.0M + working capital 2.0M</div>
    </div>
    <div class="stat-card">
      <div class="label">Net Present Value</div>
      <div class="val">AED 12.08M</div>
      <div class="sub">AED 12,083,628 at 11.50%</div>
    </div>
    <div class="stat-card">
      <div class="label">Internal Rate of Return</div>
      <div class="val">26.30%</div>
      <div class="sub">14.80 pts above hurdle</div>
    </div>
    <div class="stat-card">
      <div class="label">Payback Period</div>
      <div class="val">3.10 Yrs</div>
      <div class="sub">Discounted: 3.98 Yrs</div>
    </div>
  </div>

  <div class="notice">
    <strong>Academic notice.</strong> NovaRetail GCC is a <strong>hypothetical entity constructed for academic evaluation</strong>.
    It is not a real company, and no figure in this report constitutes investment advice or a vendor quotation.
    The corporate-finance methodology, the UAE tax treatment (9% federal corporate tax) and the DEWA tariff
    references are real and current; the capital-cost estimates and the operating benefit case are illustrative.
    Section 12 sets out the full provenance and the model's limitations without embellishment.
  </div>

  <div class="cover-block">
    <table>
      <tbody>
        <tr><td style="width:32%"><strong>Investment proposal</strong></td><td>Automated Micro-Fulfilment Centre (goods-to-person robotics, ASRS, warehouse control system), urban Dubai</td></tr>
        <tr><td><strong>Sponsoring entity</strong></td><td>NovaRetail GCC &mdash; omnichannel retail group, United Arab Emirates (hypothetical)</td></tr>
        <tr><td><strong>Decision requested</strong></td><td>Approval of the full AED 24,000,000 commitment (Option 1 of four)</td></tr>
        <tr><td><strong>Evaluation horizon</strong></td><td>6 years, plus terminal salvage and working-capital recovery in Year 6</td></tr>
        <tr><td><strong>Discount rate</strong></td><td>11.50% weighted average cost of capital (derivation in Section 4)</td></tr>
        <tr><td><strong>Analytical engine</strong></td><td>CapExIQ deterministic TypeScript capital-budgeting engine; AI advisory layer is non-computational</td></tr>
        <tr><td><strong>Document status</strong></td><td>Board memorandum &mdash; for decision</td></tr>
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- ================= 1. EXECUTIVE SUMMARY ================= -->
  <h2>1. Executive Summary and Recommendation</h2>
  <p>
    Management asks the Committee to approve a capital commitment of <strong>AED 24,000,000</strong> to build an
    Automated Micro-Fulfilment Centre in Dubai. The commitment comprises <strong>AED 22,000,000</strong> of capital
    expenditure and <strong>AED 2,000,000</strong> of incremental working capital, the latter recovered in full at the
    end of Year 6. Evaluated over a six-year life at a weighted average cost of capital of <strong>11.50%</strong>, the
    proposal generates a net present value of <strong>AED 12,083,628</strong> on a present value of inflows of
    <strong>AED 36,083,628</strong>.
  </p>

  <div class="approve-box">
    <strong>Recommendation: APPROVE the full AED 24,000,000 investment (Option 1), subject to two conditions.</strong>
    <ol style="margin-top:8px; margin-bottom:0;">
      <li><strong>Release capital against measured Year-1 savings, not against the calendar.</strong> Benefit
      realisation dominates every other variable in the model: a &plusmn;20% movement in operating benefits swings NPV by
      <strong>AED 16.67 million</strong>, roughly twice the effect of the next-ranked driver. Capital should be drawn in
      tranches unlocked by verified savings run-rates rather than by elapsed time.</li>
      <li><strong>Require a vendor performance guarantee and a secondary-market equipment buyback before
      commitment.</strong> The pessimistic scenario is genuinely value-destroying &mdash; NPV <strong>(AED 4,940,625)</strong>
      with an IRR of 8.23%, below the cost of capital. A contractual floor under both throughput performance and
      residual value converts that downside from an unhedged loss into a bounded one.</li>
    </ol>
  </div>

  <h3>1.1 Why the Committee should approve</h3>
  <ul>
    <li><strong>The return is well clear of the hurdle.</strong> IRR of 26.30% exceeds the 11.50% WACC by 14.80
    percentage points. Modified IRR of 19.34%, which reinvests interim cash at the cost of capital rather than at the
    project's own return, still clears the hurdle by 7.84 points.</li>
    <li><strong>Capital efficiency is strong.</strong> A profitability index of 1.5035 means each AED 1.00 committed
    returns AED 1.5035 of present value &mdash; AED 0.5035 of value created per dirham deployed. Simple return on
    investment over the life is 123.3%.</li>
    <li><strong>Capital is recovered inside the asset's life with margin.</strong> Simple payback is 3.10 years and
    discounted payback 3.98 years, against a six-year evaluation horizon.</li>
    <li><strong>The downside is survivable and quantified.</strong> Operating benefits can fall <strong>29.0%</strong>
    below plan before NPV reaches zero, and total outlay can overrun by <strong>50.4%</strong> (to AED 36.08 million)
    before value is destroyed. A 5,000-run Monte Carlo simulation puts the probability of a negative NPV at
    approximately <strong>0.3%</strong>.</li>
    <li><strong>The probability-weighted outcome remains positive.</strong> Weighting the optimistic, base and
    pessimistic scenarios 50/25/25 gives an expected NPV of <strong>AED 9,560,152</strong>.</li>
  </ul>

  <h3>1.2 What the Committee should watch</h3>
  <p>
    One automated risk alert fires on the base case: <strong>downside exposure in the pessimistic scenario</strong>.
    Under a combined stress of +15% capital cost, &minus;25% benefits, +15% operating cost and a 14.5% discount rate, the
    project destroys AED 4.94 million of value. The engine's benefit-shortfall rule (which fires when the tolerable
    shortfall falls below 15%) and its salvage-dependence rule (which fires when salvage exceeds 15% of NPV) do
    <em>not</em> fire: the tolerance is 29.0% and the present value of salvage is 8.61% of NPV. Those two rules are
    reported here as satisfied, not as active alerts.
  </p>

  <div class="page-break"></div>

  <!-- ================= 2. THE DECISION AND THE OPTIONS ================= -->
  <h2>2. The Investment Decision and the Strategic Options</h2>
  <p>
    NovaRetail GCC's manual fulfilment operation has become the binding constraint on its online growth in Dubai and
    Abu Dhabi. The question before the Committee is not whether automation is directionally correct but
    <em>how much capital to commit, and when</em>. Four options were framed. Only Option 1 is modelled end-to-end by
    the deterministic engine; the remaining three are assessed qualitatively against it, and no net present value is
    quoted for them, because none has been run through the same schedule.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:20%">Option</th>
        <th style="width:16%">Year-0 commitment</th>
        <th>Case for</th>
        <th>Case against</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Approve in full</strong><br /><span style="color:#15803d;font-weight:700">RECOMMENDED</span></td>
        <td class="num">AED 24,000,000</td>
        <td>Captures the full benefit curve from Year 1; the only configuration valued end-to-end, at NPV AED 12,083,628, IRR 26.30%, PI 1.5035.</td>
        <td>Commits the entire sum before any savings are observed &mdash; which is precisely what condition (1) of the recommendation is designed to mitigate.</td>
      </tr>
      <tr>
        <td><strong>2. Phased build</strong></td>
        <td class="num">AED 14,000,000<br />then AED 10,000,000</td>
        <td>Caps initial exposure at AED 14.0 million and buys a genuine abandonment option after the first phase.</td>
        <td>Defers a material share of the benefit stream and adds re-mobilisation cost. Not modelled on the same basis, so its NPV is not comparable and is deliberately not quoted.</td>
      </tr>
      <tr>
        <td><strong>3. Delay 12 months</strong></td>
        <td class="num">Nil in Year 0</td>
        <td>Buys another year of demand evidence and possibly cheaper robotics.</td>
        <td>Forfeits roughly a full year of the benefit stream while the fulfilment bottleneck persists; the value of the delay option was not quantified by the engine.</td>
      </tr>
      <tr>
        <td><strong>4. Reject</strong></td>
        <td class="num">Nil</td>
        <td>Preserves capital for alternative uses.</td>
        <td>Forgoes AED 12.08 million of modelled value creation and leaves the operational constraint unaddressed.</td>
      </tr>
    </tbody>
  </table>

  <div class="caution-box">
    <strong>A note on comparability.</strong> It would be straightforward, and misleading, to present indicative NPVs
    for Options 2 to 4. This report does not, because those figures would not come from the same verified schedule as
    Option 1. Where a number is not produced by the engine, it is not stated.
  </div>

  <div class="page-break"></div>

  <!-- ================= 3. METHODOLOGY ================= -->
  <h2>3. Corporate Finance Methodology</h2>
  <p>
    The appraisal follows standard discounted cash-flow practice. Cash flows are incremental, after tax, and stated in
    nominal AED; financing cash flows are excluded from the flows themselves and captured instead through the discount
    rate. Each measure below is computed by the deterministic engine from the same Section 6 schedule.
  </p>

  <h3>3.1 Free cash flow</h3>
  <div class="formula">FCF = (EBITDA &minus; Depreciation) &times; (1 &minus; t) + Depreciation &minus; &Delta;Working Capital &minus; CapEx + Salvage</div>
  <p>The cash the asset actually releases each year. Depreciation is subtracted to obtain taxable profit, then added back because it is not a cash outflow &mdash; its only cash effect is the tax it shelters.</p>

  <h3>3.2 Net present value</h3>
  <div class="formula">NPV = &Sigma; [ FCF&#8348; / (1 + r)&#8319; ] &minus; Initial Outlay ,  r = 11.50%</div>
  <p>The value added to the firm today, in dirhams. A positive NPV means the project earns more than the capital it consumes costs. This is the primary decision rule.</p>

  <h3>3.3 Internal rate of return</h3>
  <div class="formula">IRR = r such that NPV(r) = 0</div>
  <p>The annualised return implied by the cash-flow profile. It is compared with the 11.50% hurdle; it is a ranking check, not a substitute for NPV.</p>

  <h3>3.4 Modified internal rate of return</h3>
  <div class="formula">MIRR = (FV of inflows reinvested at r / PV of outflows at r)^(1/n) &minus; 1</div>
  <p>Corrects the IRR's implicit assumption that interim cash is reinvested at the project's own return; MIRR reinvests it at the cost of capital instead, which is the honest assumption.</p>

  <h3>3.5 Profitability index</h3>
  <div class="formula">PI = PV of future inflows / Initial Outlay = 36,083,628 / 24,000,000 = 1.5035</div>
  <p>Value created per dirham committed. It is the right ranking metric when capital is rationed, which it is.</p>

  <h3>3.6 Payback and discounted payback</h3>
  <div class="formula">Payback = years until cumulative FCF &ge; 0   |   Discounted payback = years until cumulative PV &ge; 0</div>
  <p>Liquidity and exposure measures, read directly off the cumulative rows of the Section 6 schedule by linear interpolation within the crossing year. Neither measures profitability; both measure how long capital is at risk.</p>

  <div class="highlight-box">
    <strong>Convention.</strong> Year 0 is the commitment date. All operating flows are treated as occurring at each
    year end. Depreciation is straight-line <em>to salvage value</em>, not to zero: (AED 22,000,000 &minus; AED 2,000,000)
    &divide; 6 years = <strong>AED 3,333,333 per year</strong>, generating an annual tax shield of
    <strong>AED 300,000</strong> at the 9% rate.
  </div>

  <div class="page-break"></div>

  <!-- ================= 4. COST OF CAPITAL ================= -->
  <h2>4. Cost of Capital &mdash; WACC Derivation</h2>
  <p>
    The 11.50% discount rate is built up from observable market inputs and two explicit judgemental premia, both of
    which are disclosed rather than buried in a rounded rate.
  </p>

  <h3>4.1 Cost of equity</h3>
  <table>
    <thead>
      <tr><th style="width:52%">Component</th><th class="num" style="width:16%">Rate</th><th>Basis</th></tr>
    </thead>
    <tbody>
      <tr><td>Risk-free rate</td><td class="num">4.20%</td><td>UAE sovereign benchmark yield</td></tr>
      <tr><td>Equity risk premium &times; beta (1.15 &times; 6.00%)</td><td class="num">6.90%</td><td>Market ERP geared to retail-logistics beta</td></tr>
      <tr><td>UAE country risk premium</td><td class="num">0.75%</td><td>Sovereign spread adjustment</td></tr>
      <tr><td>Project execution premium</td><td class="num">3.50%</td><td>First-of-kind automation delivery risk</td></tr>
      <tr style="background-color:#eef2f7"><td><strong>Cost of equity (K<sub>e</sub>)</strong></td><td class="num"><strong>15.35%</strong></td><td><strong>4.20% + (1.15 &times; 6.00%) + 0.75% + 3.50%</strong></td></tr>
    </tbody>
  </table>

  <h3>4.2 Cost of debt</h3>
  <table>
    <thead>
      <tr><th style="width:52%">Component</th><th class="num" style="width:16%">Rate</th><th>Basis</th></tr>
    </thead>
    <tbody>
      <tr><td>3-month EIBOR (live)</td><td class="num">3.79%</td><td>Prevailing UAE interbank benchmark</td></tr>
      <tr><td>Credit spread</td><td class="num">2.50%</td><td>Corporate borrowing margin</td></tr>
      <tr><td>Pre-tax cost of debt</td><td class="num">6.29%</td><td>3.79% + 2.50%</td></tr>
      <tr style="background-color:#eef2f7"><td><strong>After-tax cost of debt (K<sub>d</sub>)</strong></td><td class="num"><strong>5.72%</strong></td><td><strong>6.29% &times; (1 &minus; 0.09)</strong></td></tr>
    </tbody>
  </table>

  <h3>4.3 Weighted average</h3>
  <div class="formula">WACC = (E/V &times; K&#8337;) + (D/V &times; K&#8336;)
     = (0.60 &times; 15.35%) + (0.40 &times; 5.72%)
     = 9.21% + 2.29%
     = 11.50%</div>
  <p>
    The target structure is 60% equity / 40% debt. The interest tax shield is captured in the after-tax cost of debt at
    the UAE statutory 9% rate, so it is not double-counted in the cash flows. The resulting <strong>11.50%</strong> is
    the hurdle applied throughout this report and the discount rate underlying every factor in Section 6.
  </p>

  <div class="page-break"></div>

  <!-- ================= 5. CAPITAL OUTLAY ================= -->
  <h2>5. Capital Outlay Breakdown</h2>
  <table>
    <thead>
      <tr><th style="width:38%">Component</th><th class="num" style="width:18%">Amount (AED)</th><th class="num" style="width:12%">Share</th><th>Treatment</th></tr>
    </thead>
    <tbody>
      <tr><td>Automation equipment</td><td class="num">18,000,000</td><td class="num">75.0%</td><td>Capitalised; depreciated straight-line to salvage</td></tr>
      <tr><td>Installation and systems integration</td><td class="num">2,500,000</td><td class="num">10.4%</td><td>Capitalised into the depreciable base</td></tr>
      <tr><td>Software and licensing</td><td class="num">1,200,000</td><td class="num">5.0%</td><td>Capitalised into the depreciable base</td></tr>
      <tr><td>Training and launch support</td><td class="num">300,000</td><td class="num">1.3%</td><td>Capitalised into the depreciable base</td></tr>
      <tr style="background-color:#eef2f7"><td><strong>Total capital expenditure</strong></td><td class="num"><strong>22,000,000</strong></td><td class="num"><strong>91.7%</strong></td><td><strong>Depreciable base for Section 6</strong></td></tr>
      <tr><td>Incremental working capital</td><td class="num">2,000,000</td><td class="num">8.3%</td><td>Not depreciated; recovered in full in Year 6</td></tr>
      <tr class="row-total" style="background-color:#0f172a;color:#ffffff"><td><strong>Total Year-0 outlay</strong></td><td class="num"><strong>24,000,000</strong></td><td class="num"><strong>100.0%</strong></td><td><strong>Denominator for PI, ROI and payback</strong></td></tr>
    </tbody>
  </table>
  <p class="fn">Shares are computed on the AED 24,000,000 total outlay and rounded to one decimal place; they sum to 100.0%.</p>

  <h3>5.1 Depreciation and the terminal year</h3>
  <ul>
    <li><strong>Depreciable base:</strong> AED 22,000,000 (capital expenditure only; working capital is never depreciated).</li>
    <li><strong>Method:</strong> straight-line to salvage &mdash; (22,000,000 &minus; 2,000,000) &divide; 6 = <strong>AED 3,333,333 per year</strong>.</li>
    <li><strong>Annual tax shield:</strong> 3,333,333 &times; 9% = <strong>AED 300,000 per year</strong>.</li>
    <li><strong>Year 6 terminal inflows:</strong> salvage AED 2,000,000 plus working-capital recovery AED 2,000,000 = AED 4,000,000, on top of that year's operating cash flow of AED 9,186,330.</li>
  </ul>
  <p>
    Because the asset is written down to its salvage value rather than to zero, there is no book gain or loss on
    disposal in Year 6 and therefore no balancing tax charge. The salvage inflow is recognised gross.
  </p>

  <div class="page-break"></div>

  <!-- ================= 6. FREE CASH FLOW SCHEDULE ================= -->
  <h2>6. Six-Year Free Cash Flow Schedule</h2>
  <p>
    All figures in AED. Negative amounts are shown in parentheses. Year-1 operating savings of AED 7,500,000 grow at
    4% per annum; Year-1 contribution margin of AED 2,500,000 grows at 5%; Year-1 operating expenses of AED 2,200,000
    grow at 3%. Tax is charged at the UAE statutory 9% on EBIT. Depreciation is straight-line to salvage at
    AED 3,333,333 per year for six years. Cash flows are discounted at the 11.50% WACC derived in Section 4.
  </p>

  <table class="schedule">
    <thead>
      <tr>
        <th style="width:24%">Line item</th>
        <th class="num">Year 0</th>
        <th class="num">Year 1</th>
        <th class="num">Year 2</th>
        <th class="num">Year 3</th>
        <th class="num">Year 4</th>
        <th class="num">Year 5</th>
        <th class="num">Year 6</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleRows()}
    </tbody>
  </table>

  <p class="fn">
    Rows are rendered directly from the engine's schedule data; they are not transcribed by hand. Present values are
    computed at full precision (1 &divide; 1.115&#8319;) and then rounded to the nearest dirham; the discount factors are
    displayed to four decimal places, so re-computing a present value from the displayed factor will differ by a few
    hundred dirhams. Summing the rounded present-value row gives AED 12,083,629 against the stated NPV of
    AED 12,083,628 &mdash; a one-dirham rounding difference, not a discrepancy.
  </p>

  <h3>6.1 Reading the schedule</h3>
  <ul>
    <li><strong>The NPV ties out.</strong> The cumulative discounted row closes at <strong>AED 12,083,628</strong> in
    Year 6 &mdash; the same figure headlined on the cover and in Section 7. The sum of the present values of Years 1 to 6
    is AED 36,083,628, from which the AED 24,000,000 outlay is deducted.</li>
    <li><strong>Payback falls in Year 4.</strong> Cumulative undiscounted FCF turns positive between Year 3
    (AED (811,124)) and Year 4 (AED 7,612,030), giving 3.10 years by interpolation. Cumulative discounted FCF turns
    positive in the same year (AED (5,332,657) to AED 117,077), giving 3.98 years &mdash; the tighter, and the one the
    Committee should use.</li>
    <li><strong>Year 6 is inflated by the terminal items.</strong> Free cash flow of AED 13,186,330 in Year 6 includes
    AED 2,000,000 of salvage and AED 2,000,000 of working-capital recovery. Stripping both leaves AED 9,186,330 of
    genuine operating cash flow, so the year is not carried by its terminal value.</li>
    <li><strong>The tax shield is small but real.</strong> Depreciation of AED 3,333,333 shelters AED 300,000 of tax
    each year; over six years that is AED 1,800,000 of undiscounted cash retained.</li>
  </ul>

  

  <div class="page-break"></div>

  <!-- ================= 7. METRICS VS BENCHMARKS ================= -->
  <h2>7. Investment Metrics Against Benchmarks</h2>
  <table>
    <thead>
      <tr>
        <th style="width:28%">Metric</th>
        <th class="num" style="width:20%">Base case</th>
        <th style="width:20%">Benchmark</th>
        <th style="width:10%">Verdict</th>
        <th>Reading</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Net present value</strong></td>
        <td class="num">AED 12,083,628</td>
        <td>&gt; AED 0</td>
        <td class="pass">PASS</td>
        <td>Value created after paying for all capital consumed</td>
      </tr>
      <tr>
        <td><strong>Internal rate of return</strong></td>
        <td class="num">26.30%</td>
        <td>&gt; 11.50% WACC</td>
        <td class="pass">PASS</td>
        <td>14.80 points of spread over the hurdle</td>
      </tr>
      <tr>
        <td><strong>Modified IRR</strong></td>
        <td class="num">19.34%</td>
        <td>&gt; 11.50% WACC</td>
        <td class="pass">PASS</td>
        <td>Holds up when interim cash is reinvested at the cost of capital</td>
      </tr>
      <tr>
        <td><strong>Profitability index</strong></td>
        <td class="num">1.5035</td>
        <td>&gt; 1.00</td>
        <td class="pass">PASS</td>
        <td>AED 1.5035 of present value per AED 1.00 committed</td>
      </tr>
      <tr>
        <td><strong>Simple payback</strong></td>
        <td class="num">3.10 years</td>
        <td>&lt; 4.0 years</td>
        <td class="pass">PASS</td>
        <td>Capital recovered during Year 4 of a 6-year life</td>
      </tr>
      <tr>
        <td><strong>Discounted payback</strong></td>
        <td class="num">3.98 years</td>
        <td>&lt; 4.5 years</td>
        <td class="pass">PASS</td>
        <td>Recovered in Year 4 even after the cost of capital</td>
      </tr>
      <tr>
        <td><strong>Return on investment</strong></td>
        <td class="num">123.3%</td>
        <td>&gt; 0%</td>
        <td class="pass">PASS</td>
        <td>Undiscounted; see derivation note below</td>
      </tr>
      <tr>
        <td><strong>Present value of inflows</strong></td>
        <td class="num">AED 36,083,628</td>
        <td>&gt; AED 24,000,000</td>
        <td class="pass">PASS</td>
        <td>Covers the outlay 1.50 times over</td>
      </tr>
    </tbody>
  </table>
  <p class="fn">
    Derivation note: return on investment is the undiscounted net cash gain over the life divided by the total outlay
    &mdash; AED 29,594,653 (the Year-6 cumulative free cash flow in Section 6) &divide; AED 24,000,000 = 123.3%. It is
    reported for completeness only; it ignores the time value of money and must not be read alongside the IRR as if the
    two were comparable rates. Every benchmark in the third column is NovaRetail's standing capital-approval threshold,
    not a figure produced by the model.
  </p>

  <div class="highlight-box">
    <strong>All eight tests pass.</strong> No metric in the base case falls short of its threshold. That is a statement
    about the base case only; Sections 8 to 11 test what happens when the base case is wrong.
  </div>

  <!-- ================= 8. SCENARIOS ================= -->
  <h2>8. Scenario Analysis</h2>
  <p>
    Three internally consistent states of the world were run end-to-end through the engine. Each flexes capital cost,
    benefits, operating cost and the discount rate together, because in practice these move together rather than
    independently.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:16%">Scenario</th>
        <th style="width:26%">Assumption set</th>
        <th class="num" style="width:16%">NPV (AED)</th>
        <th class="num" style="width:10%">IRR</th>
        <th class="num" style="width:9%">PI</th>
        <th class="num" style="width:11%">Payback</th>
        <th>Decision</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Optimistic</strong></td>
        <td>CapEx &times;0.95, benefits &times;1.10, OpEx &times;0.95, WACC 10.5%</td>
        <td class="num">19,013,977</td>
        <td class="num">33.59%</td>
        <td class="num">1.830</td>
        <td class="num">2.63 yrs</td>
        <td class="pass">APPROVE</td>
      </tr>
      <tr>
        <td><strong>Base</strong></td>
        <td>As modelled in Section 6, WACC 11.50%</td>
        <td class="num">12,083,628</td>
        <td class="num">26.30%</td>
        <td class="num">1.504</td>
        <td class="num">3.10 yrs</td>
        <td class="pass">APPROVE</td>
      </tr>
      <tr>
        <td><strong>Pessimistic</strong></td>
        <td>CapEx &times;1.15, benefits &times;0.75, OpEx &times;1.15, WACC 14.5%</td>
        <td class="num neg">(4,940,625)</td>
        <td class="num">8.23%</td>
        <td class="num">0.819</td>
        <td class="num">5.06 yrs</td>
        <td class="fail">REJECT</td>
      </tr>
    </tbody>
  </table>

  <div class="caution-box">
    <strong>Expected NPV, weighted 50% optimistic / 25% base / 25% pessimistic: AED 9,560,152.</strong>
    The probability-weighted outcome is comfortably positive, but the pessimistic branch is not a rounding error &mdash;
    it destroys AED 4.94 million and returns 8.23%, below the 11.50% cost of capital, with a payback that runs past the
    asset's economic life. This single result is the one automated risk alert firing on the base case, and it is the
    reason condition (2) of the recommendation asks for a vendor performance guarantee and an equipment buyback.
  </div>

  <div class="page-break"></div>

  <!-- ================= 9. SENSITIVITY ================= -->
  <h2>9. Sensitivity Analysis</h2>
  <p>
    <strong>Normalisation.</strong> Every driver below is flexed by an identical <strong>&plusmn;20%</strong> about its
    base value, one at a time, with all other drivers held at base. This matters: a tornado chart built from
    driver-specific ranges (say &plusmn;10% on capital cost but &plusmn;30% on demand) ranks the analyst's assumptions rather
    than the project's economics. Applying one common percentage makes the swing column a like-for-like measure of how
    much NPV each driver actually controls.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:8%">Rank</th>
        <th style="width:30%">Driver</th>
        <th class="num" style="width:17%">NPV at &minus;20% (AED M)</th>
        <th class="num" style="width:17%">NPV at +20% (AED M)</th>
        <th class="num" style="width:14%">Swing (AED M)</th>
        <th>Direction</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1</strong></td>
        <td><strong>Operating benefits</strong></td>
        <td class="num">3.75</td>
        <td class="num">20.42</td>
        <td class="num"><strong>16.67</strong></td>
        <td>Positive</td>
      </tr>
      <tr>
        <td><strong>2</strong></td>
        <td>Project life</td>
        <td class="num">7.76</td>
        <td class="num">16.15</td>
        <td class="num"><strong>8.39</strong></td>
        <td>Positive</td>
      </tr>
      <tr>
        <td><strong>3</strong></td>
        <td>Capital expenditure</td>
        <td class="num">16.21</td>
        <td class="num">7.96</td>
        <td class="num"><strong>8.25</strong></td>
        <td>Inverse</td>
      </tr>
      <tr>
        <td><strong>4</strong></td>
        <td>Discount rate (WACC)</td>
        <td class="num">14.81</td>
        <td class="num">9.64</td>
        <td class="num"><strong>5.17</strong></td>
        <td>Inverse</td>
      </tr>
      <tr>
        <td><strong>5</strong></td>
        <td>Operating expenses</td>
        <td class="num">13.87</td>
        <td class="num">10.30</td>
        <td class="num"><strong>3.57</strong></td>
        <td>Inverse</td>
      </tr>
      <tr>
        <td><strong>6</strong></td>
        <td>Savings growth rate</td>
        <td class="num">&mdash;</td>
        <td class="num">&mdash;</td>
        <td class="num"><strong>1.10</strong></td>
        <td>Positive</td>
      </tr>
      <tr>
        <td><strong>7</strong></td>
        <td>Salvage value</td>
        <td class="num">&mdash;</td>
        <td class="num">&mdash;</td>
        <td class="num"><strong>0.37</strong></td>
        <td>Positive</td>
      </tr>
    </tbody>
  </table>
  <p class="fn">
    Base-case NPV is AED 12.08 million. For ranks 6 and 7 the engine recorded the swing magnitude only; the individual
    endpoints are therefore shown as unavailable rather than reconstructed, since a symmetric back-calculation would be
    an assumption, not a result.
  </p>

  <h3>9.1 What the ranking means for the decision</h3>
  <p>
    Operating benefits swing NPV by AED 16.67 million &mdash; almost exactly twice the second-ranked driver and larger
    than the base-case NPV itself. Benefit realisation is not one risk among several; it is the risk. Capital cost
    discipline (rank 3) and financing cost (rank 4) matter, but a project team that delivers the savings can absorb a
    20% capital overrun and still return AED 7.96 million, whereas a team that delivers the asset on budget but misses
    the savings by 20% returns AED 3.75 million. Salvage value is close to irrelevant at AED 0.37 million of swing,
    which is a healthy sign: the case does not depend on the resale market.
  </p>

  <h3>9.2 Break-even frontiers</h3>
  <table>
    <thead>
      <tr><th style="width:34%">Variable</th><th class="num" style="width:22%">Break-even point</th><th>Interpretation</th></tr>
    </thead>
    <tbody>
      <tr><td>Operating benefits</td><td class="num">&minus;29.0%</td><td>Benefits may fall 29.0% below plan before NPV reaches zero</td></tr>
      <tr><td>Total capital outlay</td><td class="num">+50.4%</td><td>Outlay may overrun to AED 36.08 million before value is destroyed</td></tr>
      <tr><td>Discount rate</td><td class="num">26.30%</td><td>NPV is zero at a 26.30% discount rate &mdash; by definition the IRR</td></tr>
      <tr><td>Operating expenses</td><td class="num">+136%</td><td>Running costs could more than double before the case fails</td></tr>
      <tr><td>Salvage dependence</td><td class="num">8.61%</td><td>Present value of salvage is 8.61% of NPV &mdash; well inside the 15% alert threshold</td></tr>
    </tbody>
  </table>
  <p>
    The 29.0% benefit tolerance sits comfortably above the engine's 15% alert threshold, so the benefit-shortfall rule
    does not fire. It is nonetheless the tightest of the four operating frontiers, which is consistent with the tornado
    ranking and with condition (1) of the recommendation.
  </p>

  <div class="page-break"></div>

  <!-- ================= 10. MONTE CARLO ================= -->
  <h2>10. Monte Carlo Risk Simulation</h2>
  <p>
    Scenario analysis tests three futures; the simulation tests five thousand. Four inputs were allowed to vary
    simultaneously, each with a distribution chosen to match how that input actually behaves, and the full six-year
    schedule was re-solved on every draw.
  </p>

  <table>
    <thead>
      <tr><th style="width:34%">Parameter</th><th style="width:26%">Distribution</th><th>Rationale</th></tr>
    </thead>
    <tbody>
      <tr><td>Capital expenditure</td><td>Triangular</td><td>Bounded above and below by vendor quotation ranges; overruns are asymmetric</td></tr>
      <tr><td>Operating savings</td><td>Normal</td><td>Aggregate of many independent process improvements</td></tr>
      <tr><td>Operating expenses</td><td>Triangular</td><td>Bounded by contracted maintenance and energy tariffs</td></tr>
      <tr><td>Discount rate (WACC)</td><td>Normal</td><td>Driven by EIBOR movement around a central expectation</td></tr>
    </tbody>
  </table>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">Iterations</div>
      <div class="val">5,000</div>
      <div class="sub">Random seed 12345</div>
    </div>
    <div class="stat-card">
      <div class="label">Mean NPV</div>
      <div class="val">~AED 10.5M</div>
      <div class="sub">Below the AED 12.08M base case</div>
    </div>
    <div class="stat-card">
      <div class="label">P(NPV &lt; 0)</div>
      <div class="val">~0.3%</div>
      <div class="sub">Roughly 1 run in 333</div>
    </div>
    <div class="stat-card">
      <div class="label">P(NPV &gt; 0)</div>
      <div class="val">~99.7%</div>
      <div class="sub">Complement of the above</div>
    </div>
  </div>

  <p>
    Two readings matter. First, the mean simulated NPV of approximately <strong>AED 10.5 million</strong> sits
    <em>below</em> the AED 12,083,628 base case. That gap is informative: the distribution is left-skewed, because
    capital overruns and benefit shortfalls hurt more than the symmetric upside helps. The base case is therefore
    mildly optimistic relative to the probability-weighted centre of the distribution, and the Committee should
    anchor on the AED 10.5 million figure rather than on the headline.
  </p>
  <p>
    Second, a <strong>0.3%</strong> probability of a negative NPV is a statement about the assumed distributions, not
    about the world. It says the project is robust to the ordinary co-movement of costs, savings and rates that the
    model contemplates. It says nothing about a vendor insolvency, a technology failure or a demand collapse &mdash;
    none of which is in the distribution. The pessimistic scenario in Section 8, which does destroy value, is the
    appropriate reference point for those risks, and the run seed (12345) is fixed so that this figure is exactly
    reproducible.
  </p>

  <div class="page-break"></div>

  <!-- ================= 11. RISK REGISTER ================= -->
  <h2>11. Risk Register and Mitigations</h2>
  <div class="caution-box">
    <strong>Automated alerts firing on the base case: one.</strong> The engine's rule set evaluates three conditions.
    Only <em>downside exposure in the pessimistic scenario</em> is triggered. The benefit-shortfall rule (fires below a
    15% tolerance) and the salvage-dependence rule (fires above a 15% share of NPV) are satisfied at 29.0% and 8.61%
    respectively and are <strong>not</strong> active alerts. They are listed in the register below as monitored risks
    because they are real exposures, not because the engine flagged them.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:6%">Ref</th>
        <th style="width:22%">Risk</th>
        <th style="width:12%">Status</th>
        <th style="width:12%">Exposure</th>
        <th>Mitigation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>R1</strong></td>
        <td><strong>Downside exposure &mdash; pessimistic scenario</strong></td>
        <td class="fail">ALERT ACTIVE</td>
        <td class="num">NPV (4,940,625)</td>
        <td>Vendor performance guarantee with liquidated damages tied to throughput; secondary-market equipment buyback agreed before commitment; stage-gate abandonment right after Phase 1 acceptance.</td>
      </tr>
      <tr>
        <td><strong>R2</strong></td>
        <td>Benefit realisation shortfall</td>
        <td>Monitored &mdash; not firing</td>
        <td class="num">29.0% tolerance</td>
        <td>Release capital against measured Year-1 savings run-rate rather than the calendar; monthly cost-per-order reporting to the Committee against the AED 7,500,000 Year-1 target.</td>
      </tr>
      <tr>
        <td><strong>R3</strong></td>
        <td>Capital cost overrun</td>
        <td>Monitored</td>
        <td class="num">50.4% tolerance</td>
        <td>Fixed-price integration contract; contingency drawn only on Committee approval; overrun ceiling reported against the AED 36.08 million break-even.</td>
      </tr>
      <tr>
        <td><strong>R4</strong></td>
        <td>Financing cost movement (EIBOR)</td>
        <td>Monitored</td>
        <td class="num">5.17M NPV swing</td>
        <td>Fix or cap the debt tranche at drawdown; re-run the WACC derivation in Section 4 at each stage gate using the then-current 3-month EIBOR.</td>
      </tr>
      <tr>
        <td><strong>R5</strong></td>
        <td>Asset life shorter than six years</td>
        <td>Monitored</td>
        <td class="num">8.39M NPV swing</td>
        <td>Preventive maintenance contract for the full term; obsolescence review at Year 3; modular refresh path specified in the procurement scope.</td>
      </tr>
      <tr>
        <td><strong>R6</strong></td>
        <td>Salvage / residual value dependence</td>
        <td>Satisfied &mdash; not firing</td>
        <td class="num">8.61% of NPV</td>
        <td>No action required. The case does not rest on resale; the buyback in R1 provides a floor in any event.</td>
      </tr>
      <tr>
        <td><strong>R7</strong></td>
        <td>Operating cost inflation</td>
        <td>Monitored</td>
        <td class="num">+136% tolerance</td>
        <td>Energy consumption metered against the DEWA tariff assumption; maintenance costs contracted at fixed escalation.</td>
      </tr>
      <tr>
        <td><strong>R8</strong></td>
        <td>Model risk &mdash; unmodelled tax and ramp-up effects</td>
        <td>Disclosed</td>
        <td>Not quantified</td>
        <td>Section 12 lists each simplification. Re-run the schedule with a benefit ramp-up curve and the AED 375,000 zero-rate band before financial close.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- ================= 12. PROVENANCE AND LIMITATIONS ================= -->
  <h2>12. Data Provenance and Model Limitations</h2>
  <p>
    The Committee is entitled to know exactly which numbers are observed and which are assumed. The following is a
    complete statement, including the parts that weaken the case.
  </p>

  <h3>12.1 What is genuine external data</h3>
  <table>
    <thead>
      <tr><th style="width:26%">Source</th><th style="width:30%">What it is</th><th>How it is used</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>DataCo Smart Supply Chain</strong><br />Mendeley Data 8gx2fvg2k6, CC BY 4.0</td>
        <td>Genuine external operational benchmark dataset covering US supply-chain transactions</td>
        <td><strong>Operational benchmarking and dashboard illustration only. It does NOT feed the financial model.</strong> No figure in Section 6 is derived from it. It is US data applied to a UAE context, and it is presented as context, not as evidence for the benefit case.</td>
      </tr>
      <tr>
        <td><strong>DEWA commercial tariffs</strong></td>
        <td>Real and current published Dubai electricity tariffs</td>
        <td>Energy cost component of the operating expense line</td>
      </tr>
      <tr>
        <td><strong>UAE Federal Corporate Tax</strong></td>
        <td>Real and current &mdash; 9% statutory rate, effective June 2023</td>
        <td>Tax line in the Section 6 schedule</td>
      </tr>
      <tr>
        <td><strong>3-month EIBOR</strong></td>
        <td>Live UAE interbank benchmark, 3.79%</td>
        <td>Base rate in the cost-of-debt build-up in Section 4</td>
      </tr>
    </tbody>
  </table>

  <h3>12.2 What is estimated</h3>
  <ul>
    <li><strong>Capital cost figures are illustrative estimates, not vendor quotations.</strong> The AED 18,000,000
    equipment line, the AED 2,500,000 installation line and the software and training lines have not been tendered. A
    real tender is the single most valuable piece of evidence the Committee could obtain before financial close.</li>
    <li><strong>The benefit case is assumed, not observed.</strong> Year-1 savings of AED 7,500,000 and contribution
    margin of AED 2,500,000, and their 4% and 5% growth rates, are management estimates. Section 9 shows this is the
    dominant driver, so the weakest-evidenced input is also the most important one.</li>
    <li><strong>Salvage value of AED 2,000,000</strong> is an estimate of six-year-old automation residual value in a
    thin secondary market.</li>
  </ul>

  <h3>12.3 Known simplifications in the model</h3>
  <ul>
    <li><strong>Flat 9% tax.</strong> The model applies 9% to the whole of EBIT and ignores the UAE
    <strong>AED 375,000 zero-rate band</strong>. This overstates the tax charge by up to AED 33,750 per year and so
    understates NPV very slightly &mdash; a conservative error, but an error.</li>
    <li><strong>No loss carry-forward.</strong> Every year in the base case is profitable, so the omission is
    immaterial here; in the pessimistic scenario it is not, and the AED (4,940,625) result should be read as somewhat
    worse than a full tax model would produce.</li>
    <li><strong>No benefit ramp-up curve.</strong> Year-1 savings are assumed to be realised in full from the first
    year. Real automation programmes ramp over two to four quarters. This is the most optimistic single assumption in
    the model, and it biases NPV upward.</li>
    <li><strong>Year-end cash flow convention.</strong> All operating flows are treated as arriving at year end, which
    understates present value slightly relative to mid-year timing.</li>
    <li><strong>No inflation differential.</strong> Savings, margin and cost lines each grow at a single fixed rate;
    no separate general-inflation adjustment is applied.</li>
    <li><strong>No terminal or continuing value.</strong> The asset is assumed to be worth only its salvage value after
    Year 6, with no continuing operation. This is conservative.</li>
  </ul>

  <div class="highlight-box">
    <strong>Net direction of the biases.</strong> The absent ramp-up curve pushes NPV up; the ignored zero-rate band,
    the year-end convention and the absence of any continuing value push it down. They have not been netted, and the
    Committee should not assume they cancel.
  </div>

  <div class="page-break"></div>

  <!-- ================= 13. AI GOVERNANCE ================= -->
  <h2>13. Artificial Intelligence Governance Statement</h2>
  <p>
    CapExIQ is an AI-assisted capital-budgeting dashboard. The Committee should be precise about what the AI does and
    does not do in this report.
  </p>

  <h3>13.1 The mathematics is deterministic</h3>
  <p>
    Every figure in Sections 6 to 11 &mdash; the free cash flow schedule, NPV, IRR, MIRR, profitability index, payback,
    the scenario set, the sensitivity swings, the break-even frontiers and the Monte Carlo distribution &mdash; is
    produced by <strong>deterministic TypeScript</strong> running fixed formulae over fixed inputs. No language model
    computes, adjusts, rounds or selects any number in this document. Given the same inputs the engine returns the same
    outputs, every time; the Monte Carlo section is seeded (12345) precisely so that even the stochastic result is
    reproducible.
  </p>

  <h3>13.2 The AI layer is advisory and non-computational</h3>
  <p>
    The AI assistant drafts narrative, explains methodology in plain language, and answers questions about results it
    is given. It has no write access to the financial engine, cannot alter an assumption, cannot approve or reject a
    project, and cannot originate a figure. Where this report contains judgement &mdash; the ranking of options, the
    two conditions attached to the recommendation, the reading of the risk register &mdash; that judgement is
    management's and is open to challenge on its merits.
  </p>

  <h3>13.3 Accountability</h3>
  <div class="approve-box">
    <strong>Final responsibility for this investment decision rests with the Chief Financial Officer and the Capital
    Expenditure Committee &mdash; not with the AI system.</strong> CapExIQ is a decision-support tool. It structures
    evidence, enforces arithmetic consistency and makes assumptions explicit. It does not carry fiduciary
    responsibility, and no part of this report should be read as delegating that responsibility to software.
  </div>

  <h3>13.4 Auditability</h3>
  <ul>
    <li>All inputs, formulae and outputs are held in version-controlled source; this report is regenerated from that
    source by <code>scripts/generate-board-report.js</code> rather than assembled by hand.</li>
    <li>The Section 6 schedule is rendered from structured data, so a figure cannot drift between the schedule and the
    headline metrics without the source changing.</li>
    <li>Assumptions, data sources, methodology and known limitations are documented separately in the repository
    (<code>ASSUMPTIONS.md</code>, <code>DATA_SOURCES.md</code>, <code>FINANCIAL_METHODOLOGY.md</code>,
    <code>MODEL_LIMITATIONS.md</code>, <code>AI_GOVERNANCE.md</code>).</li>
  </ul>

  <!-- ================= 14. APPROVAL ================= -->
  <h2>14. Approval</h2>
  <p>
    The Capital Expenditure Committee is asked to approve <strong>Option 1 &mdash; the full AED 24,000,000
    commitment</strong> to the Automated Micro-Fulfilment Centre, subject to the two conditions set out in Section 1:
    tranche release against measured Year-1 savings, and a vendor performance guarantee with a secondary-market
    equipment buyback agreed before commitment.
  </p>

  <div class="sign-grid">
    <div class="sign-card">
      <div class="role">Chief Financial Officer</div>
      <div class="rule"></div>
      <div class="cap">Signature</div>
      <div class="rule"></div>
      <div class="cap">Name / Date</div>
    </div>
    <div class="sign-card">
      <div class="role">Chief Executive Officer</div>
      <div class="rule"></div>
      <div class="cap">Signature</div>
      <div class="rule"></div>
      <div class="cap">Name / Date</div>
    </div>
    <div class="sign-card">
      <div class="role">Capital Expenditure Committee Chair</div>
      <div class="rule"></div>
      <div class="cap">Signature</div>
      <div class="rule"></div>
      <div class="cap">Name / Date</div>
    </div>
  </div>

  <div class="notice" style="margin-top:18px">
    <strong>Document control.</strong> CapExIQ Board Investment Report &mdash; Topic 9, AI Capital-Budgeting Dashboard
    &nbsp;|&nbsp; Entity: NovaRetail GCC (hypothetical, for academic evaluation) &nbsp;|&nbsp; Base case at WACC 11.50%,
    six-year horizon &nbsp;|&nbsp; Generated ${REPORT_DATE} by <code>scripts/generate-board-report.js</code> from the
    deterministic CapExIQ engine &nbsp;|&nbsp; Supersedes all prior ad-hoc versions of this document, including any
    five-year Section 6 schedule.
  </div>

  <div class="footer-text">
    CapExIQ Governance System &nbsp;|&nbsp; Prepared for the NovaRetail GCC Capital Expenditure Committee &nbsp;|&nbsp;
    Deterministic financial engine &mdash; AI advisory layer is non-computational
  </div>

</body>
</html>`;

  // ------------------------------------------------------------------
  // Render. Same Playwright/chromium invocation as scripts/generate-pdf.js,
  // with a running header/footer added for a board document.
  // ------------------------------------------------------------------
  const headerTemplate = `
    <div style="width:100%; font-family:Helvetica,Arial,sans-serif; font-size:7pt; color:#94a3b8;
                padding:0 16mm; display:flex; justify-content:space-between;">
      <span>CapExIQ &mdash; Board Investment Report</span>
      <span>NovaRetail GCC &mdash; Automated Micro-Fulfilment Centre, Dubai</span>
    </div>`;

  const footerTemplate = `
    <div style="width:100%; font-family:Helvetica,Arial,sans-serif; font-size:7pt; color:#94a3b8;
                padding:0 16mm; display:flex; justify-content:space-between;">
      <span>Hypothetical entity &mdash; prepared for academic evaluation</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: { top: '16mm', bottom: '14mm', left: '15mm', right: '15mm' },
  });
  await browser.close();

  console.log(`Successfully generated Board Investment Report at: ${pdfPath}`);
  console.log('Base case: NPV AED 12,083,628 | IRR 26.30% | PI 1.5035 | payback 3.10 yrs | WACC 11.50%');
}

generateBoardReport().catch((err) => {
  console.error('Error generating Board Investment Report:', err);
  process.exit(1);
});
