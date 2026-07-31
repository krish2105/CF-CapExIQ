import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export interface ThreatVector {
  dimension: string;
  score: number; // 0 to 100
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  mitigationStrategy: string;
}

export interface ThreatRadarResponse {
  overallThreatScore: number;
  threatLevel: 'STABLE' | 'MODERATE ELEVATED' | 'HIGH EXPOSURE';
  threatVectors: ThreatVector[];
  executiveRiskSummary: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assumptions, metrics } = body;

    const fallbackResponse: ThreatRadarResponse = {
      overallThreatScore: 38,
      threatLevel: 'MODERATE ELEVATED',
      threatVectors: [
        {
          dimension: 'DEWA Tariff Escalation',
          score: 45,
          riskLevel: 'Moderate',
          mitigationStrategy: 'Lock in 3-year commercial solar power purchase agreement (PPA) to cap energy costs.',
        },
        {
          dimension: 'Robotics Integration Lead Time',
          score: 55,
          riskLevel: 'Moderate',
          mitigationStrategy: 'Enforce liquid damages clause of 1.5%/week on Swisslog AMR equipment delivery delays.',
        },
        {
          dimension: 'UAE Corporate Tax Impact',
          score: 25,
          riskLevel: 'Low',
          mitigationStrategy: 'Utilize qualifying free-zone reinvestment exemptions under UAE Federal Tax Law.',
        },
        {
          dimension: 'Inflation & Labor Rate Hikes',
          score: 40,
          riskLevel: 'Moderate',
          mitigationStrategy: 'Accelerate Phase-1 automated picking to permanently replace manual shift labor.',
        },
        {
          dimension: 'SLA Demand Conversion',
          score: 30,
          riskLevel: 'Low',
          mitigationStrategy: 'Sign pre-launch SLA volume commitments with NovaRetail GCC anchor merchant partners.',
        },
        {
          dimension: 'WACC Interest Rate Volatility',
          score: 35,
          riskLevel: 'Low',
          mitigationStrategy: 'Hedge EIBOR exposure with a 5-year fixed interest rate swap at 4.85%.',
        },
      ],
      executiveRiskSummary: 'Overall capital risk posture remains well-controlled (Threat Score: 38/100). The primary risk vectors center on warehouse automation commissioning lead times and DEWA commercial power tariff spikes.',
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!apiKey) {
      return NextResponse.json(fallbackResponse);
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a Chief Risk Officer AI for NovaRetail GCC.
Analyze financial model assumptions and compute a multi-axis threat radar across 6 dimensions. Scores are 0 to 100.

Return ONLY a JSON object matching this schema:
{
  "overallThreatScore": number,
  "threatLevel": "STABLE" | "MODERATE ELEVATED" | "HIGH EXPOSURE",
  "threatVectors": [
    { "dimension": string, "score": number, "riskLevel": "Low" | "Moderate" | "High" | "Critical", "mitigationStrategy": string }
  ],
  "executiveRiskSummary": string
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
      const parsed = JSON.parse(content) as ThreatRadarResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.error('Error in /api/ai/threat-radar:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate threat radar' },
      { status: 500 }
    );
  }
}
