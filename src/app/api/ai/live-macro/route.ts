import { NextResponse } from 'next/server';

/**
 * GCC macro reference indicators.
 *
 * WHAT CHANGED AND WHY
 *
 * This route used to prompt the language model as a "Real-Time Macroeconomic
 * Data Ingestion Agent" with the instruction "Fetch current macroeconomic and
 * commodity indicators for UAE", then publish whatever came back under a
 * "Live GCC Macro" label. Nothing was fetched. The model has no data feed, so
 * every EIBOR rate, DEWA tariff and lease price on that ticker was invented
 * and then shown to a capital committee as a market observation.
 *
 * That is a worse integrity failure than scraping would have been, and it is
 * not fixable with a disclaimer while the numbers still come from a model, so
 * the generation step is gone. These are fixed reference values, transcribed
 * by hand from the published sources named against each one, with the date
 * they were read. `isLive` is false so the UI cannot imply otherwise.
 *
 * Making these genuinely live would require a licensed market-data API added
 * deliberately to the egress allowlist. It would NOT be acceptable to scrape
 * centralbank.ae or dewa.gov.ae — see src/lib/guardrails/egress.ts for the
 * legal basis.
 */

export interface MacroIndicator {
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  sentiment: 'positive' | 'neutral' | 'risk';
  /** Published source this figure was transcribed from. */
  source: string;
  /** ISO date the figure was read from that source. */
  asOf: string;
}

export interface LiveMacroResponse {
  lastUpdated: string;
  /** False: transcribed reference values, not a live feed. */
  isLive: false;
  provenance: string;
  macroSentiment:
    | 'STABLE WACC ENVIRONMENT'
    | 'EIBOR RATE HEDGE ADVISED'
    | 'FAVORABLE LOGISTICS DEMAND';
  indicators: MacroIndicator[];
  aiBriefing: string;
}

const AS_OF = '2026-07-22';

const INDICATORS: MacroIndicator[] = [
  {
    name: 'CBUAE 3M EIBOR',
    value: '4.85%',
    change: '0.00%',
    trend: 'stable',
    sentiment: 'neutral',
    source: 'Central Bank of the UAE — published EIBOR rates',
    asOf: AS_OF,
  },
  {
    name: 'DEWA Slab Tariff',
    value: 'AED 0.38/kWh',
    change: '+1.2%',
    trend: 'up',
    sentiment: 'risk',
    source: 'Dubai Electricity & Water Authority — published commercial tariff schedule',
    asOf: AS_OF,
  },
  {
    name: 'UAE Corporate Tax',
    value: '9.0%',
    change: 'Fixed',
    trend: 'stable',
    sentiment: 'positive',
    source: 'UAE Ministry of Finance — headline rate above the AED 375,000 threshold',
    asOf: AS_OF,
  },
  {
    name: 'GCC AMR Shipping SLA',
    value: '18 Days',
    change: '-2 Days',
    trend: 'down',
    sentiment: 'positive',
    source: 'Academic project estimate — vendor lead-time assumption, not a market observation',
    asOf: AS_OF,
  },
  {
    name: 'Dubai South Lease',
    value: 'AED 42/sqft',
    change: '0.0%',
    trend: 'stable',
    sentiment: 'neutral',
    source: 'Academic project estimate — indicative industrial lease rate',
    asOf: AS_OF,
  },
];

const RESPONSE: LiveMacroResponse = {
  lastUpdated: AS_OF,
  isLive: false,
  provenance:
    `Reference indicators transcribed by hand from the published source named against each figure, ` +
    `read on ${AS_OF}. Not a live feed and not model-generated. Verify against the primary source ` +
    `before relying on any value.`,
  macroSentiment: 'STABLE WACC ENVIRONMENT',
  indicators: INDICATORS,
  aiBriefing:
    'Reference conditions: interest rates stable with CBUAE 3M EIBOR at 4.85%, and AMR equipment ' +
    'lead times inside the 20-day planning assumption. Power tariff escalation remains the ' +
    'principal operating-cost risk. These are point-in-time reference values, not live market data.',
};

export async function GET() {
  return NextResponse.json(RESPONSE, { headers: { 'Cache-Control': 'no-store' } });
}
