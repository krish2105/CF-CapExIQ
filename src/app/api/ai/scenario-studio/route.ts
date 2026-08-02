import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export interface GeneratedScenarioStudio {
  scenarioName: string;
  narrativeDescription: string;
  multipliers: {
    investmentMultiplier: number;
    operatingBenefitMultiplier: number;
    operatingCostMultiplier: number;
    discountRate: number;
  };
  triangularDistribution: {
    minBenefitMultiplier: number;
    modeBenefitMultiplier: number;
    maxBenefitMultiplier: number;
  };
  keyAssumptions: string[];
  macroRiskFactors: string[];
}

const DEFAULT_FALLBACK_SCENARIO: GeneratedScenarioStudio = {
  scenarioName: 'Generative Macro Expansion Scenario',
  narrativeDescription: 'Models a 20% increase in order volume adoption backed by favorable UAE logistics policies, offset by a 5% increase in robotics maintenance OpEx.',
  multipliers: {
    investmentMultiplier: 0.95,
    operatingBenefitMultiplier: 1.20,
    operatingCostMultiplier: 1.05,
    discountRate: 0.105,
  },
  triangularDistribution: {
    minBenefitMultiplier: 1.05,
    modeBenefitMultiplier: 1.20,
    maxBenefitMultiplier: 1.45,
  },
  keyAssumptions: [
    'Urban delivery SLA demand surges to 12,000 orders/day in Year 2.',
    'CapEx outlay compressed by 5% via multi-vendor competitive bidding.',
    'WACC hurdle rate reduced to 10.5% due to favorable commercial credit spreads.',
  ],
  macroRiskFactors: [
    'DEWA utility tariff escalation during peak summer months.',
    'Port customs clearance delays for imported warehouse tote conveyors.',
  ],
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userPrompt } = body;

    const promptText = userPrompt || 'Simulate GCC e-commerce logistics expansion boom';

    const fallbackScenario: GeneratedScenarioStudio = {
      ...DEFAULT_FALLBACK_SCENARIO,
      narrativeDescription: `Generated scenario based on user input: "${promptText}". Models a 20% increase in order volume adoption backed by favorable UAE logistics policies, offset by a 5% increase in robotics maintenance OpEx.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return NextResponse.json(fallbackScenario);
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a Generative Macroeconomic Scenario & Monte Carlo Fitter for NovaRetail GCC.
Generate realistic investment scenario parameters based on user input text.

Return ONLY a JSON object matching this schema:
{
  "scenarioName": string,
  "narrativeDescription": string,
  "multipliers": {
    "investmentMultiplier": number,
    "operatingBenefitMultiplier": number,
    "operatingCostMultiplier": number,
    "discountRate": number
  },
  "triangularDistribution": {
    "minBenefitMultiplier": number,
    "modeBenefitMultiplier": number,
    "maxBenefitMultiplier": number
  },
  "keyAssumptions": string[],
  "macroRiskFactors": string[]
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User Prompt: "${promptText}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as GeneratedScenarioStudio;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackScenario);
  } catch (error: any) {
    console.warn('Using fallback scenario studio due to API key / network state:', error?.message);
    return NextResponse.json(DEFAULT_FALLBACK_SCENARIO);
  }
}
