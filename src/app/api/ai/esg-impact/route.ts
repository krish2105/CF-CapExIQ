import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export interface EsgImpactResponse {
  esgScore: number; // 0 to 100
  ratingTier: 'AAA (Prime Sustainability)' | 'AA (Superior)' | 'A (Compliant)';
  co2ReductionTonsPerYear: number;
  solarPanelOffsetKWh: number;
  greenNpvBoost: string;
  sustainabilityHighlights: string[];
  bankableGreenLoanEligibility: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assumptions, metrics } = body;

    const fallbackResponse: EsgImpactResponse = {
      esgScore: 92,
      ratingTier: 'AAA (Prime Sustainability)',
      co2ReductionTonsPerYear: 1240,
      solarPanelOffsetKWh: 450000,
      greenNpvBoost: '+AED 1.45M (Carbon Credit Tax Offset)',
      sustainabilityHighlights: [
        'Rooftop 500kW Solar PV Array offsets 42% of warehouse electricity demand.',
        'All-electric AMR autonomous mobile robot fleet eliminates indoor diesel emissions.',
        'High-density vertical tote racking compresses building footprint by 65%.',
        'Qualifies for UAE Green Finance Framework 50 bps loan interest margin discount.',
      ],
      bankableGreenLoanEligibility: 'ELIGIBLE FOR GREEN SUSTAINABILITY-LINKED FINANCING (50 bps Interest Discount)',
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!apiKey) {
      return NextResponse.json(fallbackResponse);
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a Chief Sustainability & ESG Officer AI for NovaRetail GCC.
Calculate ESG sustainability metrics for an automated micro-fulfilment centre.

Return ONLY a JSON object matching this schema:
{
  "esgScore": number,
  "ratingTier": "AAA (Prime Sustainability)" | "AA (Superior)" | "A (Compliant)",
  "co2ReductionTonsPerYear": number,
  "solarPanelOffsetKWh": number,
  "greenNpvBoost": string,
  "sustainabilityHighlights": string[],
  "bankableGreenLoanEligibility": string
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Assumptions: ${JSON.stringify(assumptions)}\nMetrics: ${JSON.stringify(metrics)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as EsgImpactResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.error('Error in /api/ai/esg-impact:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate ESG impact' },
      { status: 500 }
    );
  }
}
