import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export interface BoardMemberStatement {
  role: 'CFO' | 'COO' | 'CRO' | 'Strategy';
  title: string;
  name: string;
  avatar: string;
  verdict: 'APPROVE' | 'CONDITIONAL' | 'DEFER' | 'REJECT';
  statement: string;
  keyConcernOrDriver: string;
}

export interface BoardDebateResponse {
  consensusDecision: 'APPROVE WITH GATES' | 'UNCONDITIONAL APPROVAL' | 'DEFER INVESTIGATION' | 'REJECT';
  consensusSummary: string;
  voteCount: {
    approve: number;
    conditional: number;
    defer: number;
    reject: number;
  };
  statements: BoardMemberStatement[];
  stageGates: string[];
  disclaimer: string;
}

const DEFAULT_FALLBACK_DEBATE: BoardDebateResponse = {
  consensusDecision: 'APPROVE WITH GATES',
  consensusSummary: 'The Executive Board debate concluded with a unified consensus to APPROVE WITH GATES for the AED 24.0M NovaRetail GCC Dubai Micro-Fulfilment Centre proposal.',
  voteCount: { approve: 2, conditional: 2, defer: 0, reject: 0 },
  statements: [
    {
      role: 'CFO',
      title: 'Chief Financial Officer',
      name: 'Tariq Al-Mansoor',
      avatar: '👔',
      verdict: 'APPROVE',
      statement: 'Project NPV of AED 12.08M and IRR of 26.3% clear our corporate hurdle rate. Payback period is 3.1 years.',
      keyConcernOrDriver: 'High Profitability Index (1.50x) and strong debt service coverage.',
    },
    {
      role: 'COO',
      title: 'Chief Operating Officer',
      name: 'Elena Rostova',
      avatar: '⚙️',
      verdict: 'APPROVE',
      statement: 'Fulfillment latency drops from 24h to 2h, unlocking 15,000 order/day capacity.',
      keyConcernOrDriver: 'SLA throughput bottleneck resolution.',
    },
    {
      role: 'CRO',
      title: 'Chief Risk Officer',
      name: 'Marcus Vance',
      avatar: '🛡️',
      verdict: 'CONDITIONAL',
      statement: 'Pessimistic scenario shows sensitivity to DEWA rates. Enforce stage-gate capital releases.',
      keyConcernOrDriver: 'Robotics vendor SLA penalties and DEWA energy inflation.',
    },
    {
      role: 'Strategy',
      title: 'Strategy Director',
      name: 'Dr. Aisha Al-Hassan',
      avatar: '🎯',
      verdict: 'CONDITIONAL',
      statement: 'Phased rollout protects downside risk while establishing market leadership in Dubai South.',
      keyConcernOrDriver: 'First-mover advantage in GCC automated logistics.',
    },
  ],
  stageGates: [
    'Gate 1: Vendor contract execution with 15% maximum CapEx overrun ceiling clause.',
    'Gate 2: WCS/WMS integration test demonstrating < 50ms API response latency.',
    'Gate 3: Solar rooftop PPA sign-off to cap DEWA commercial tariff exposure.',
  ],
  disclaimer: 'AI-generated executive debate simulation based on corporate hurdle rates and risk profiles.',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assumptions, metrics, selectedScenario } = body;

    const npv = metrics?.npv ? `AED ${(metrics.npv / 1000000).toFixed(2)}M` : 'AED 12.08M';
    const irr = metrics?.irr ? `${(metrics.irr * 100).toFixed(1)}%` : '26.3%';
    const mirr = metrics?.mirr ? `${(metrics.mirr * 100).toFixed(1)}%` : '19.3%';
    const payback = metrics?.paybackPeriodYears ? `${metrics.paybackPeriodYears.toFixed(1)} years` : '3.1 years';
    const wacc = assumptions?.discountRate ? `${(assumptions.discountRate * 100).toFixed(1)}%` : '11.5%';

    const fallbackResponse: BoardDebateResponse = {
      ...DEFAULT_FALLBACK_DEBATE,
      consensusSummary: `The Executive Board debate concluded with a unified consensus to APPROVE WITH GATES for the AED 24.0M NovaRetail GCC Dubai Micro-Fulfilment Centre proposal. Strong financial metrics (NPV of ${npv}, IRR of ${irr} vs ${wacc} WACC) satisfy capital hurdle requirements, while operationally compressing delivery SLAs from 24h to 2h. However, capital release is gated across 3 deployment phases to mitigate robotics integration and utility cost risks.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return NextResponse.json(fallbackResponse);
    }

    const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });

    const systemPrompt = `You are an Executive Board Debate Simulation Swarm for NovaRetail GCC evaluating a AED 24.0M automated micro-fulfilment centre.
Simulate a debate between 4 board members:
1. CFO: Focuses on NPV, IRR, WACC hurdle rate, and payback.
2. COO: Focuses on picking throughput, order fulfillment SLAs, and labor savings.
3. CRO: Focuses on downside risk, DEWA energy spikes, and vendor integration delays.
4. Strategy Director: Focuses on market share, competitor quick-commerce expansion, and long-term option value.

Return ONLY a JSON object matching this schema:
{
  "consensusDecision": "APPROVE WITH GATES" | "UNCONDITIONAL APPROVAL" | "DEFER INVESTIGATION" | "REJECT",
  "consensusSummary": string,
  "voteCount": { "approve": number, "conditional": number, "defer": number, "reject": number },
  "statements": [
    {
      "role": "CFO" | "COO" | "CRO" | "Strategy",
      "title": string,
      "name": string,
      "avatar": string,
      "verdict": "APPROVE" | "CONDITIONAL" | "DEFER" | "REJECT",
      "statement": string,
      "keyConcernOrDriver": string
    }
  ],
  "stageGates": string[],
  "disclaimer": string
}`;

    const userPrompt = `Financial Model Context:
- Scenario: ${selectedScenario || 'Base'}
- Initial Capital Outlay: AED ${metrics?.totalInitialOutlay ? (metrics.totalInitialOutlay / 1000000).toFixed(2) + 'M' : '24.0M'}
- NPV: ${npv}
- IRR: ${irr}
- MIRR: ${mirr}
- WACC Hurdle Rate: ${wacc}
- Payback Period: ${payback}

Simulate the executive board debate and output structured JSON.`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as BoardDebateResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.warn('Using fallback board debate due to API key / network state:', error?.message);
    return NextResponse.json(DEFAULT_FALLBACK_DEBATE);
  }
}
