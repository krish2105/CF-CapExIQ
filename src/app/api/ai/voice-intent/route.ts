import { NextResponse } from 'next/server';
import { createModelClient } from '@/lib/ai/client';
import { AI_MAX_TOKENS } from '@/lib/ai/limits';
import { aiGenerated, aiFallback, type AiResponseMeta } from '@/lib/ai/response';
import { parseModelOutput, VoiceIntentSchema } from '@/lib/ai/schemas';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { guardInput, safeContextJson } from '@/lib/guardrails/aiGuardrails';

export interface VoiceIntentResponse extends AiResponseMeta {
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
  // `assumptions.edit`: this endpoint returns `proposedUpdates` that drive
  // `updateAssumptions()`, so voice is a write path into the capital model.
  // A CEO lacks this permission by design — the matrix says the model is
  // changed by CFO and Analyst, and a microphone must not be a way around it.
  const auth = await requirePermission('assumptions.edit');
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('voice-intent', auth.session);
  if (limited) return limited;

  // Guardrails run before the try so a refusal is a refusal. Inside it, the
  // catch would convert one into a fallback 200 carrying model updates —
  // precisely the outcome the guard exists to prevent on a write path.
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* handled by the guard below, which rejects a non-string speech field */
  }
  const { currentAssumptions } = body ?? {};

  // A transcript is untrusted free text: speech-to-text will faithfully
  // transcribe "ignore all previous instructions" spoken at a microphone.
  const guarded = guardInput(
    typeof body?.userSpeech === 'string' && body.userSpeech.trim()
      ? body.userSpeech
      : 'Summarize project viability'
  );
  if (!guarded.ok) {
    return NextResponse.json(
      { error: 'guardrail', message: guarded.message, notices: guarded.notices },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const speechText = guarded.text;

  try {

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

      // Deterministic keyword parsing, not a model result. It genuinely
      // reflects what the user said, but the caller must still be able to
      // tell it apart from an interpreted intent.
      return aiFallback(
        {
          spokenSummary: actionTaken + ` Current project NPV is strong.`,
          actionTaken,
          proposedUpdates,
        },
        'provider-unconfigured'
      );
    }

    const openai = createModelClient(apiKey);

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
        {
          role: 'user',
          content:
            `Current Assumptions: ${safeContextJson(currentAssumptions)}\n` +
            `User Spoken Input: "${speechText}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: AI_MAX_TOKENS,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const outcome = parseModelOutput(VoiceIntentSchema, content);
      if (!outcome.ok) {
        // Logged with the reason: "the model omitted voteCount.reject" and
        // "the provider is down" are different problems that used to produce
        // identical output.
        console.warn('voice-intent: rejected completion - ' + outcome.issue);
        return aiFallback(fallbackResponse, 'parse-failed');
      }
      const parsed = outcome.data;
      return aiGenerated(parsed);
    }

    return aiFallback(fallbackResponse, 'provider-empty');
  } catch (error: any) {
    console.warn('Using fallback voice intent due to API key / network state:', error?.message);
    return aiFallback(DEFAULT_FALLBACK_VOICE, 'provider-error');
  }
}
