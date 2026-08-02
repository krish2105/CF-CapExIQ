# CapExIQ — 90-Second Demonstration Script

Every figure quoted below is a deterministic engine output pinned by `tests/golden.test.ts`. Do not
state a number on screen that the engine does not produce.

## Timeline Walkthrough

| Time | Action | Talking points |
| :--- | :--- | :--- |
| **00:00 – 00:15** | Open `/` then `/dashboard` | "This is CapExIQ, our Topic 9 AI capital-budgeting dashboard. NovaRetail GCC is evaluating an AED 24.0 million Automated Micro-Fulfilment Centre in Dubai — AED 22.0M of CapEx plus AED 2.0M of working capital — over a **six-year** life. The base case returns an **NPV of AED 12,083,628** at an **11.50% WACC**, an **IRR of 26.30%**, an **MIRR of 19.34%**, a **profitability index of 1.5035**, and payback in **3.10 years**, **3.98 discounted**. The engine's decision status is **Approve**." |
| **00:15 – 00:30** | Click the theme toggle in the header | "Light, dark and system themes are driven by `next-themes` over semantic CSS tokens, so every chart and status badge re-colours consistently and stays legible in a printed board pack." |
| **00:30 – 00:45** | Switch the active scenario to **Pessimistic** | "The stress case raises capital cost **15%**, cuts operating benefits **25%**, raises operating costs **15%**, and lifts the hurdle rate to **14.5%**. NPV goes to **minus AED 4,940,625**, IRR falls to **8.23%**, the profitability index drops to **0.819**, and the engine's decision flips from Approve to **Reject**. Weighting the three scenarios 50 / 25 / 25 gives an expected NPV of **AED 9,560,152** — still positive, but the downside is a genuine loss, not a smaller gain." |
| **00:45 – 01:00** | Open `/monte-carlo` | "Five thousand seeded iterations — Mulberry32, seed 12345 — over triangular CapEx and OpEx distributions and normal distributions on savings and WACC. The **mean NPV is approximately AED 10.5 million**, and the **probability of a negative NPV is about 0.3%**. Note that this is deterministic simulation, not AI: the same seed reproduces the same result every time, and it is only as good as the distributions we assumed." |
| **01:00 – 01:15** | Open `/sensitivity` | "Every driver is flexed by the same ±20%, so the bars are comparable. **Operating benefits dominate**, with an NPV swing of **AED 16.67 million** — roughly double project life at 8.39M and CapEx at 8.25M. Benefits can fall **29.0%** before NPV hits zero. That single number is why the recommendation is conditional." |
| **01:15 – 01:25** | Open `/external-data` | "The 11.50% hurdle rate is derived, not assumed. Cost of equity is 4.20% risk-free plus 1.15 beta on a 6.00% ERP, plus a 0.75% UAE country risk premium and a 3.50% project execution premium — **15.35%**. Cost of debt is the live 3.79% three-month EIBOR plus a 2.50% spread, **5.72% after tax**. At 60/40 equity to debt that lands exactly on **11.50%**." |
| **01:25 – 01:30** | Open `/printable-report` and print | "The board memorandum exports with print-optimised CSS. The recommendation is **Approve**, subject to two conditions: release capital against measured Year-1 savings, and require a vendor performance guarantee and buyback on the residual value." |

## Numbers to Have Ready if Questioned

| Question | Answer |
| :--- | :--- |
| Why is MIRR below IRR? | MIRR reinvests interim cash flows at the 11.50% WACC rather than at the 26.30% IRR. It is the more conservative of the two, and at 19.34% it still clears the hurdle by nearly 8 points. |
| What is the depreciation? | Straight line **to salvage**: (22.0M − 2.0M) ÷ 6 = **AED 3,333,333 per year**. Not MACRS — that is a US accelerated regime and does not apply here. |
| How dependent is this on salvage? | Barely. The present value of the AED 2.0M salvage is **8.61% of NPV**, and salvage is the weakest sensitivity driver at a 0.37M swing. |
| How much cost overrun can it absorb? | Total outlay can rise **50.4%**, to AED 36.08M, before NPV reaches zero. |
| At what discount rate does it break even? | **26.30%** — which is, by definition, the IRR. |
| Is any of the maths done by AI? | No. All eight metrics are deterministic TypeScript, pinned by `tests/golden.test.ts`. AI explains outputs; it never computes them. |
