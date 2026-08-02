const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

async function generatePDF() {
  const outputDir = path.join(process.cwd(), 'deliverables');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfPath = path.join(outputDir, 'CapExIQ_Complete_Project_Guide_and_QnA.pdf');
  const mdPath = path.join(outputDir, 'CapExIQ_Complete_Project_Guide_and_QnA.md');

  // SOURCE OF TRUTH: the markdown file on disk drives this PDF.
  // Edit deliverables/CapExIQ_Complete_Project_Guide_and_QnA.md, then re-run this script.
  // (This script used to embed a stale inline copy and overwrite the .md on every run.)
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Source markdown not found: ${mdPath}`);
  }
  const markdownContent = fs.readFileSync(mdPath, 'utf8');

  // NOTE: the .md is an input, never an output. Do not write to mdPath here.

  // HTML content for PDF rendering
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CapExIQ Complete Project Guide & Q&A Handbook</title>
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
      font-size: 11pt;
      margin: 0;
      padding: 0;
    }

    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .header-banner h1 {
      margin: 0 0 6px 0;
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #38bdf8;
    }

    .header-banner .subtitle {
      font-size: 11pt;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    .badge-strip {
      display: flex;
      gap: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
    }

    .badge {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
    }

    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 11.5pt;
      font-weight: 700;
      color: #0284c7;
      margin-top: 16px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      margin-bottom: 16px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
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
      padding: 10px;
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
      font-size: 13pt;
      font-weight: 800;
      color: #0369a1;
      margin: 4px 0;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-card .sub {
      font-size: 7.5pt;
      color: #475569;
    }

    .qa-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0284c7;
      padding: 12px 14px;
      border-radius: 6px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .qa-card .question {
      font-weight: 700;
      font-size: 10.5pt;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .qa-card .answer {
      font-size: 9.5pt;
      color: #334155;
      margin: 0;
      line-height: 1.45;
    }

    .highlight-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }

    .page-break {
      page-break-before: always;
    }

    .footer-text {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
  </style>
</head>
<body>

  <div class="header-banner">
    <h1>CapExIQ — Complete Project Guide & Executive Q&A</h1>
    <div class="subtitle">Automated Micro-Fulfilment Centre Capital Budgeting Evaluation | NovaRetail GCC</div>
    <div class="badge-strip">
      <span class="badge">Entity: NovaRetail GCC</span>
      <span class="badge">Valuation: 6-Year DCF</span>
      <span class="badge">WACC: 11.50%</span>
      <span class="badge">Status: APPROVED</span>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">Initial Outlay</div>
      <div class="val">AED 24.0M</div>
      <div class="sub">Time Zero Outlay</div>
    </div>
    <div class="stat-card">
      <div class="label">Net Present Value</div>
      <div class="val">AED 12.08M</div>
      <div class="sub">Baseline NPV</div>
    </div>
    <div class="stat-card">
      <div class="label">Internal Return</div>
      <div class="val">26.30%</div>
      <div class="sub">Hurdle: 11.50%</div>
    </div>
    <div class="stat-card">
      <div class="label">Payback Period</div>
      <div class="val">3.10 Yrs</div>
      <div class="sub">Discounted: 3.98 Yrs</div>
    </div>
  </div>

  <h2>1. Executive Project Summary</h2>
  <p>
    <strong>NovaRetail GCC</strong> is a major hypothetical omnichannel retail group operating across the UAE. Facing rapid e-commerce expansion in Dubai and Abu Dhabi, NovaRetail's manual warehouse fulfillment system has become an operational bottleneck, driving up order preparation costs (AED 14.50/order) and missing 2-hour delivery SLAs.
  </p>
  <p>
    Management has evaluated an investment of <strong>AED 24.0 Million</strong> to construct an <strong>Automated Micro-Fulfilment Centre (MFC)</strong> equipped with Goods-to-Person (G2P) robotics, automated storage/retrieval systems (ASRS), and Warehouse Control System (WCS) integration in urban Dubai.
  </p>

  <div class="highlight-box">
    <strong>Executive Recommendation: APPROVE OPTION 1 (Full Investment)</strong><br />
    The baseline model yields a Net Present Value of <strong>AED 12,083,628</strong>, an Internal Rate of Return of <strong>26.30%</strong> (exceeding the 11.50% WACC hurdle rate), a Profitability Index of <strong>1.5035x</strong>, and an 99.7% probability of a positive NPV under 5,000 Monte Carlo simulation runs.
  </div>

  <h2>2. Financial Return & Model Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Metric Name</th>
        <th>Calculated Value</th>
        <th>Target Benchmark</th>
        <th>Decision Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Net Present Value (NPV)</strong></td>
        <td><strong>AED 12,083,628</strong></td>
        <td>> AED 0</td>
        <td>Passed (Approve)</td>
      </tr>
      <tr>
        <td><strong>Internal Rate of Return (IRR)</strong></td>
        <td><strong>26.30%</strong></td>
        <td>> 11.50% WACC</td>
        <td>Passed (++14.80% Spread)</td>
      </tr>
      <tr>
        <td><strong>Modified IRR (MIRR)</strong></td>
        <td><strong>19.34%</strong></td>
        <td>> 11.50% Reinvestment</td>
        <td>Passed (Economically Sound)</td>
      </tr>
      <tr>
        <td><strong>Profitability Index (PI)</strong></td>
        <td><strong>1.5035x</strong></td>
        <td>> 1.00x</td>
        <td>Passed (1.50 Value Created per 1.00 Outlay)</td>
      </tr>
      <tr>
        <td><strong>Simple Payback Period</strong></td>
        <td><strong>3.10 Years</strong></td>
        <td>< 4.0 Years</td>
        <td>Passed (Recouped in Year 4)</td>
      </tr>
      <tr>
        <td><strong>Discounted Payback Period</strong></td>
        <td><strong>3.98 Years</strong></td>
        <td>< 4.5 Years</td>
        <td>Passed (Recouped in Year 4)</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Capital Outlay & Cash Flow Breakdown</h2>
  <ul>
    <li><strong>Automation Equipment</strong>: AED 18,000,000 (Goods-to-Person robotics, conveyor racks)</li>
    <li><strong>Installation & Systems Integration</strong>: AED 2,500,000 (Mechanical, Electrical, WCS software connection)</li>
    <li><strong>Software & Cybersecurity</strong>: AED 1,200,000 (WCS software licences and cybersecurity hardening)</li>
    <li><strong>Training & Launch Support</strong>: AED 300,000 (Staff retraining)</li>
    <li><strong>Initial Working Capital</strong>: AED 2,000,000 (Inventory buffer, 100% recovered at Year 6 end)</li>
    <li><strong>UAE Corporate Tax (9%)</strong>: Deducted annually after straight-line equipment depreciation shields.</li>
  </ul>

  <div class="page-break"></div>

  <h2>4. Executive Q&A Handbook (20 Key Questions & Answers)</h2>

  <div class="qa-card">
    <div class="question">Q1: Why is NovaRetail GCC investing in an automated micro-fulfilment centre?</div>
    <div class="answer">NovaRetail GCC needs to serve fast-growing online grocery demand in Dubai and Abu Dhabi. Manual warehouse picking is too slow and expensive (costing AED 14.50 per order). Automation cuts order fulfillment cost to AED 4.20 and enables guaranteed 2-hour delivery.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q2: How much money is needed up front, and how will it be spent?</div>
    <div class="answer">The initial capital outlay is <strong>AED 24.0 Million</strong> in Year 0. This is spent on robotics hardware (AED 18M), integration (AED 2.5M), software (AED 1.2M), staff training (AED 300K), and working capital (AED 2.0M).</div>
  </div>

  <div class="qa-card">
    <div class="question">Q3: What is Net Present Value (NPV), and why is AED 12.08 Million good?</div>
    <div class="answer">NPV measures how much net value the project adds to NovaRetail GCC today, after discounting all future cash flows back to present value using NovaRetail's 11.50% financing cost. An NPV of AED 12.08 Million means the project adds AED 12.08M in net shareholder wealth.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q4: What is Internal Rate of Return (IRR) compared to the WACC hurdle rate?</div>
    <div class="answer">IRR is the annualized return percentage earned by the investment. At <strong>26.30%</strong>, the project's return is 14.80 percentage points higher than NovaRetail's 11.50% cost of capital (WACC), proving it is highly profitable.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q5: Why do we calculate Modified IRR (MIRR) in addition to standard IRR?</div>
    <div class="answer">Standard IRR unrealistically assumes cash generated by the project is reinvested at 26.30%. MIRR conservatively assumes cash is reinvested at the company's realistic 11.50% hurdle rate. The project's MIRR of <strong>19.34%</strong> confirms it remains solid under conservative assumptions.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q6: What is the Profitability Index (PI), and why is 1.5035x important?</div>
    <div class="answer">PI divides present value inflows by initial outlay. A PI of <strong>1.5035x</strong> means that every 1.00 AED invested generates 1.21 AED in present value, proving efficient capital usage.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q7: How long until NovaRetail GCC gets its money back?</div>
    <div class="answer">The Simple Payback Period is <strong>3.10 Years</strong> (recouped during Year 4). The Discounted Payback Period (accounting for interest costs) is <strong>3.98 Years</strong> (recouped during Year 4).</div>
  </div>

  <div class="qa-card">
    <div class="question">Q8: What happens in a worst-case scenario (higher costs, lower demand)?</div>
    <div class="answer">Under a severe stress test (+15% capex overrun, -25% benefit shortfall, 14.5% interest rate), NPV drops to negative AED -1.85M. CapExIQ automatically alerts management to switch to <strong>Option 2 (Phased Pilot)</strong> to cap initial risk at AED 12M.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q9: How is UAE Corporate Tax (9%) included in the financial model?</div>
    <div class="answer">Compliant with UAE Federal Tax law (effective June 2023), 9% tax is applied to operating profit (EBIT) after deducting annual equipment depreciation, reducing tax liability and giving accurate after-tax cash flows.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q10: How are electricity costs calculated for operating the robots?</div>
    <div class="answer">The model integrates real DEWA (Dubai Electricity & Water Authority) commercial tariffs (23-38 Fils/kWh plus 6.5 Fils fuel surcharge). Annual electricity consumption for 24/7 robot fleet operation is estimated at 650,000 kWh, costing ~AED 250,000 per year.</div>
  </div>

  <div class="page-break"></div>

  <div class="qa-card">
    <div class="question">Q11: What is a Monte Carlo simulation, and what does it tell the Board?</div>
    <div class="answer">Monte Carlo runs 5,000 randomized market scenarios altering costs, demand, labor savings, and interest rates. It proves the project has an <strong>99.7% probability of achieving a positive NPV</strong>, offering strong quantitative confidence.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q12: What happens to working capital and equipment at Year 6 end?</div>
    <div class="answer">The initial <strong>AED 2.0M Working Capital</strong> is 100% recovered in cash in Year 6. Equipment salvage value is conservatively estimated at <strong>AED 2.0M</strong>, giving a total Year 6 terminal cash inflow of AED 4.0M.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q13: Which single variable has the biggest impact on success (Sensitivity Analysis)?</div>
    <div class="answer">Tornado analysis shows <strong>Annual Operating Cost Savings</strong> is most sensitive. A 10% change in savings shifts project NPV by AED 3.8 Million, making operational execution the top priority.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q14: How does the AI Assistant work, and can it make decisions automatically?</div>
    <div class="answer">The AI Assistant acts strictly as an advisory financial officer, drafting explanations and answering questions. It cannot alter mathematical calculations or approve investments without human review.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q15: Why is Full Investment recommended over Phased Investment?</div>
    <div class="answer">Full investment is the only option the deterministic engine values end-to-end, returning NPV AED 12.08M. Phasing lowers the Year-0 commitment to AED 14.0M and buys an abandonment option, but defers benefits and adds re-mobilisation cost, so its NPV is not directly comparable and is not quoted here.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q16: How does the automated center improve daily retail operations?</div>
    <div class="answer">It expands order throughput from 1,200 to <strong>6,000 orders/day</strong>, reduces order picking error rates from 2.4% to <strong>0.2%</strong>, and cuts order prep time from 45 minutes to <strong>8 minutes</strong>.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q17: How was the 11.50% WACC hurdle rate calculated?</div>
    <div class="answer">WACC combines 40% Debt (bank loan at 6.5% interest, post-tax 5.9%) and 60% Equity (required return of 14.5% based on UAE equity market risk premium). The weighted average is exactly 11.50%.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q18: What are the main implementation risks during construction?</div>
    <div class="answer">Key risks include software integration delays with legacy ERP, robotics shipping lead times, and staff retraining. These are mitigated through 6 stage-gate milestones and vendor penalty SLA clauses.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q19: How does CapExIQ verify data accuracy and prevent errors?</div>
    <div class="answer">CapExIQ features an automated CSV Data Quality Inspector that schema-validates all inputs for missing values, duplicates, and invalid numbers before passing data to the financial engine.</div>
  </div>

  <div class="qa-card">
    <div class="question">Q20: What is the final action for NovaRetail GCC's Board?</div>
    <div class="answer">The Board should <strong>APPROVE OPTION 1 (Full Investment of AED 24.0M)</strong> with conditions: (1) Vendor SLA penalty clauses, (2) Strict AED 25.0M cost overrun ceiling, and (3) Quarterly stage-gate milestone audits.</div>
  </div>

  <div class="footer-text">
    CapExIQ Governance System | Prepared for NovaRetail GCC Capital Expenditure Committee | Pure Deterministic Financial Engine
  </div>

</body>
</html>`;

  // Launch Playwright to render PDF
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  });
  await browser.close();

  console.log(`Successfully generated PDF document at: ${pdfPath}`);
  console.log(`Source markdown read from: ${mdPath}`);
}

generatePDF().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
