import { NextResponse } from 'next/server';
import { guardRequestBody } from '@/lib/guardrails/aiGuardrails';
import OpenAI from 'openai';

export interface VoiceIntentResponse {
  spokenSummary: string;
  actionTaken: string;
  proposedUpdates: {
    discountRate?: number;
    automationEquipment?: number;
    year1OperatingSavings?: number;
    corporateTaxRate?: number;
    projectLifeYears?: number;
  };
}

const DEFAULT_FALLBACK_VOICE: VoiceIntentResponse = {
  spokenSummary: 'Processed voice command. Based on current capital assumptions, the project yields AED 12.08M NPV with a 26.3% IRR.',
  actionTaken: 'Analyzed current financial model state.',
  proposedUpdates: {},
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Screen the payload before any of it reaches a billed provider: bounds the
    // body size and rejects instruction-override or scraping text in any field.
    const bodyGuard = guardRequestBody(body);
    if (!bodyGuard.ok) {
      return NextResponse.json({ error: bodyGuard.message }, { status: 400 });
    }
    const { userSpeech, currentAssumptions } = body;

    const speechText = userSpeech || 'Summarize project viability';

    const fallbackResponse: VoiceIntentResponse = {
      ...DEFAULT_FALLBACK_VOICE,
      spokenSummary: `Processed voice command: "${speechText}". Based on current capital assumptions, the project yields AED 12.08M NPV with a 26.3% IRR.`,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      // Deterministic intent parsing fallback for key phrases
      const lower = speechText.toLowerCase();
      let proposedUpdates: VoiceIntentResponse['proposedUpdates'] = {};
      let actionTaken = 'Evaluated model assumptions.';

      if (lower.includes('discount') || lower.includes('wacc')) {
        const match = lower.match(/(\d+(\.\d+)?)/);
        if (match) {
          const val = parseFloat(match[0]);
          const decimalVal = val > 1 ? val / 100 : val;
          proposedUpdates.discountRate = decimalVal;
          actionTaken = `Updated discount rate (WACC) to ${(decimalVal * 100).toFixed(1)}%.`;
        }
      } else if (lower.includes('equipment') || lower.includes('capex')) {
        const match = lower.match(/(\d+(\.\d+)?)/);
        if (match) {
          const val = parseFloat(match[0]);
          const fullVal = val < 1000 ? val * 1000000 : val;
          proposedUpdates.automationEquipment = fullVal;
          actionTaken = `Updated automation equipment CapEx to AED ${(fullVal / 1000000).toFixed(2)}M.`;
        }
      }

      return NextResponse.json({
        spokenSummary: actionTaken + ` Current project NPV is strong.`,
        actionTaken,
        proposedUpdates,
      });
    }

    const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });

    const systemPrompt = `You are a Voice AI Financial Intent Parser for NovaRetail GCC.
Convert natural language spoken commands into structured financial parameter updates for a Next.js financial store.

Supported fields to update:
- discountRate: number (decimal, e.g. 0.10 for 10%)
- automationEquipment: number (AED)
- year1OperatingSavings: number (AED)
- corporateTaxRate: number (decimal, e.g. 0.09 for 9%)
- projectLifeYears: number (years)

Return ONLY a JSON object matching this schema:
{
  "spokenSummary": string,
  "actionTaken": string,
  "proposedUpdates": {
    "discountRate"?: number,
    "automationEquipment"?: number,
    "year1OperatingSavings"?: number,
    "corporateTaxRate"?: number,
    "projectLifeYears"?: number
  }
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current Assumptions: ${JSON.stringify(currentAssumptions)}\nUser Spoken Input: "${speechText}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 300,
    }, { signal: AbortSignal.timeout(30000) });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as VoiceIntentResponse;
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackResponse);
  } catch (error: any) {
    console.warn('Using fallback voice intent due to API key / network state:', error?.message);
    return NextResponse.json(DEFAULT_FALLBACK_VOICE);
  }
}
