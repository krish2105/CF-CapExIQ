import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assumptions, metrics, question, prompt } = body;
    const userQuestion = question || prompt || 'Explain project financial viability';

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      // Deterministic Advisory Fallback when API key is unconfigured
      return NextResponse.json({
        answer: `[Deterministic Advisory Engine]: Based on NovaRetail GCC's capital model outputs (NPV = AED ${metrics?.npv?.toLocaleString() ?? '12.1M'}, IRR = ${((metrics?.irr ?? 0.263) * 100).toFixed(1)}%, WACC = 11.5%), the primary driver for value creation is Year-1 operating cost savings (AED 7.5M) and incremental contribution margin (AED 2.5M). MIRR (${((metrics?.mirr ?? 0.193) * 100).toFixed(1)}%) is lower than IRR because MIRR realistically assumes interim cash flows are reinvested at the company WACC rate (11.5%) rather than at the internal project return rate (${((metrics?.irr ?? 0.263) * 100).toFixed(1)}%).`,
        isFallback: true,
      });
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a Senior Corporate Finance Adviser and CFO AI assistant for NovaRetail GCC.
You answer user questions about a proposed AED 24.0M Automated Micro-Fulfilment Centre investment.

STRICT GOVERNANCE RULES:
1. You MUST NOT calculate or alter any financial figures (NPV, IRR, MIRR, PI, Payback).
2. Use ONLY the supplied, pre-calculated financial metrics and assumptions in your response.
3. Be professional, direct, financially precise, and tailored for a Capital Expenditure Committee.
4. Always state that NovaRetail GCC is a hypothetical entity for academic decision modeling.`;

    const userPrompt = `Project Context:
- Initial Outlay: AED ${metrics?.totalInitialOutlay ?? 24000000}
- Net Present Value (NPV): AED ${metrics?.npv ?? 0}
- Internal Rate of Return (IRR): ${((metrics?.irr ?? 0) * 100).toFixed(2)}%
- Modified IRR (MIRR): ${((metrics?.mirr ?? 0) * 100).toFixed(2)}%
- Profitability Index: ${metrics?.profitabilityIndex?.toFixed(2) ?? '1.0'}x
- Payback Period: ${metrics?.paybackPeriodYears?.toFixed(1) ?? 'N/A'} years
- Discount Rate (WACC): ${((assumptions?.discountRate ?? 0.115) * 100).toFixed(1)}%

User Question: ${userQuestion}`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({
      answer,
      isFallback: false,
    });
  } catch (error: any) {
    console.warn('Using fallback advisory answer due to API key / network state:', error?.message);
    return NextResponse.json({
      answer: `[Deterministic Advisory Engine]: Based on NovaRetail GCC's capital model outputs, project NPV is AED 12.08M at 11.5% WACC. The primary value drivers are automated picking labor savings and fulfillment SLA acceleration.`,
      isFallback: true,
    });
  }
}
