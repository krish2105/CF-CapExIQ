import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { StructedAIResponse } from '@/lib/types/finance';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assumptions, metrics, scenarioResults, riskAlerts } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const fallbackResponse: StructedAIResponse = {
      decision: metrics?.decisionStatus || 'Approve',
      executiveSummary: `Projected net present value of AED ${metrics?.npv ? (metrics.npv / 1000000).toFixed(2) + 'M' : '12.08M'} and an IRR of ${metrics?.irr ? (metrics.irr * 100).toFixed(1) + '%' : '26.3%'} support capital allocation for NovaRetail GCC's automated micro-fulfilment centre. The initial outlay of AED 24.0M generates AED ${metrics?.breakEvenInitialInvestment ? (metrics.breakEvenInitialInvestment / 1000000).toFixed(2) + 'M' : '36.08M'} in discounted cash inflows over 6 years.`,
      keyValueDrivers: [
        'Year 1 Labor & Process Operating Cost Savings: AED 7.5M (grows at 4% p.a.)',
        'Incremental 30-min Delivery SLA Contribution Margin: AED 2.5M (grows at 5% p.a.)',
        'Low Corporate Tax Impact: UAE 9% headline rate preserves AED 7.4M Year-1 OCF',
        'Working Capital Recovery & Equipment Salvage Value: AED 4.0M terminal inflow in Year 6',
      ],
      principalRisks: [
        'Robotics System Integration Delay: Prolongs ramp-up and defers Year-1 benefits',
        'DEWA Electricity & Cloud WCS SLA Escalation: Additional OpEx cost inflation exceeding 3%',
        'Pessimistic Stress Scenario Exposure: Benefit shortfall > 25% reduces NPV significantly',
      ],
      managementControls: [
        'Enforce milestone-gated capital release linked to WMS/WCS integration sign-offs',
        'Mandate 15% maximum capex overrun penalty clause in vendor equipment contracts',
        'Obtain secondary-market equipment buyback guarantee to secure Year-6 salvage value',
      ],
      confidence: 'High',
      disclaimer: 'AI-generated explanations and recommendations are advisory. All assumptions, calculations and final investment decisions must be reviewed and approved by a qualified human decision-maker.',
    };

    if (!apiKey) {
      return NextResponse.json(fallbackResponse);
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a Chief Financial Officer Adviser for NovaRetail GCC evaluating an automated micro-fulfilment centre.
Return your response ONLY as a JSON object matching this schema:
{
  "decision": "Approve" | "Phased Implementation" | "Delay Pending Evidence" | "Reject",
  "executiveSummary": string,
  "keyValueDrivers": string[],
  "principalRisks": string[],
  "managementControls": string[],
  "confidence": "High" | "Medium" | "Low",
  "disclaimer": string
}`;

    const userPrompt = `Financial Model Context:
- Net Present Value: AED ${metrics?.npv ?? 0}
- Internal Rate of Return: ${((metrics?.irr ?? 0) * 100).toFixed(2)}%
- Modified IRR: ${((metrics?.mirr ?? 0) * 100).toFixed(2)}%
- Profitability Index: ${metrics?.profitabilityIndex?.toFixed(2) ?? '1.0'}x
- Payback Period: ${metrics?.paybackPeriodYears?.toFixed(1) ?? 'N/A'} years
- WACC Hurdle Rate: ${((assumptions?.discountRate ?? 0.115) * 100).toFixed(1)}%

Formulate an executive board recommendation.`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as StructedAIResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.error('Error in /api/ai/recommend:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
}
