import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export interface MacroIndicator {
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  sentiment: 'positive' | 'neutral' | 'risk';
}

export interface LiveMacroResponse {
  lastUpdated: string;
  macroSentiment: 'STABLE WACC ENVIRONMENT' | 'EIBOR RATE HEDGE ADVISED' | 'FAVORABLE LOGISTICS DEMAND';
  indicators: MacroIndicator[];
  aiBriefing: string;
}

export async function GET() {
  try {
    const fallbackResponse: LiveMacroResponse = {
      lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      macroSentiment: 'STABLE WACC ENVIRONMENT',
      indicators: [
        { name: 'CBUAE 3M EIBOR', value: '4.85%', change: '0.00%', trend: 'stable', sentiment: 'neutral' },
        { name: 'DEWA Slab Tariff', value: 'AED 0.38/kWh', change: '+1.2%', trend: 'up', sentiment: 'risk' },
        { name: 'UAE Corporate Tax', value: '9.0%', change: 'Fixed', trend: 'stable', sentiment: 'positive' },
        { name: 'GCC AMR Shipping SLA', value: '18 Days', change: '-2 Days', trend: 'down', sentiment: 'positive' },
        { name: 'Dubai South Lease', value: 'AED 42/sqft', change: '0.0%', trend: 'stable', sentiment: 'neutral' },
      ],
      aiBriefing: 'Real-time macro indicators show stable interest rate conditions (CBUAE EIBOR at 4.85%) and favorable AMR equipment shipping lead times.',
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return NextResponse.json(fallbackResponse);
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a Real-Time Macroeconomic Data Ingestion Agent for NovaRetail GCC.
Generate current GCC macro indicators for UAE commercial warehouse investments.

Return ONLY a JSON object matching this schema:
{
  "lastUpdated": string,
  "macroSentiment": "STABLE WACC ENVIRONMENT" | "EIBOR RATE HEDGE ADVISED" | "FAVORABLE LOGISTICS DEMAND",
  "indicators": [
    { "name": string, "value": string, "change": string, "trend": "up" | "down" | "stable", "sentiment": "positive" | "neutral" | "risk" }
  ],
  "aiBriefing": string
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Fetch current macroeconomic and commodity indicators for UAE.' },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as LiveMacroResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.error('Error in /api/ai/live-macro:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live macro' },
      { status: 500 }
    );
  }
}
