import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { guardInput } from '@/lib/guardrails/aiGuardrails';

/**
 * Narrates a driver attribution that has already been computed.
 *
 * The decomposition itself is produced by `src/lib/finance/varianceAttribution.ts`
 * and arrives here as finished numbers. This route turns it into two or three
 * sentences a committee can read. It is explicitly forbidden from restating,
 * re-deriving or adjusting any figure — the attribution reconciles exactly, and
 * a model that "corrects" a number would break that reconciliation silently.
 */

const ContributionSchema = z.object({
  label: z.string().max(80),
  fromValue: z.number().finite(),
  toValue: z.number().finite(),
  npvImpact: z.number().finite(),
  shareOfMovement: z.number().finite(),
});

const RequestSchema = z.object({
  baselineNpv: z.number().finite(),
  comparisonNpv: z.number().finite(),
  totalChange: z.number().finite(),
  contributions: z.array(ContributionSchema).max(20),
  contextLabel: z.string().max(120).optional(),
});

const aed = (v: number) =>
  `${v < 0 ? '-' : ''}AED ${Math.abs(Math.round(v)).toLocaleString('en-US')}`;

function deterministic(body: z.infer<typeof RequestSchema>): string {
  const { totalChange, contributions, baselineNpv, comparisonNpv } = body;
  if (contributions.length === 0) {
    return 'No assumption changed between the two cases, so net present value is unchanged.';
  }
  const direction = totalChange < 0 ? 'fell' : 'rose';
  const top = contributions[0];
  const rest = contributions.slice(1, 3);

  const restText = rest.length
    ? ` ${rest.map((c) => `${c.label} contributed ${aed(c.npvImpact)}`).join(', and ')}.`
    : '';

  return (
    `Net present value ${direction} from ${aed(baselineNpv)} to ${aed(comparisonNpv)}, ` +
    `a movement of ${aed(totalChange)}. ` +
    `${top.label} accounts for ${(top.shareOfMovement * 100).toFixed(0)}% of it at ${aed(top.npvImpact)}.` +
    restText +
    ' Contributions are computed by sequential substitution and reconcile exactly to the total, so there is no unexplained residual.'
  );
}

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body. Attribution figures must all be finite numbers.' },
        { status: 400 }
      );
    }
    const body = parsed.data;

    if (body.contextLabel) {
      const guard = guardInput(body.contextLabel);
      if (!guard.ok) {
        return NextResponse.json({ explanation: deterministic(body), isFallback: true });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your-openai-api-key') || apiKey.includes('here')) {
      return NextResponse.json({ explanation: deterministic(body), isFallback: true });
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'You explain a pre-computed net-present-value attribution to a capital committee.\n' +
              'RULES:\n' +
              '1. Never compute, re-derive, round differently, or adjust any figure. Use the numbers exactly as supplied.\n' +
              '2. Do not invent drivers that are not in the supplied list.\n' +
              '3. Three sentences at most. Lead with the dominant driver and what it means for the decision.\n' +
              '4. Do not describe a negative movement as acceptable or a positive one as sufficient — state the movement and its cause, not a verdict.',
          },
          {
            role: 'user',
            content:
              `Baseline NPV: ${aed(body.baselineNpv)}\n` +
              `Comparison NPV: ${aed(body.comparisonNpv)}\n` +
              `Total change: ${aed(body.totalChange)}\n` +
              `Drivers (largest first):\n` +
              body.contributions
                .map(
                  (c) =>
                    `- ${c.label}: ${aed(c.npvImpact)} (${(c.shareOfMovement * 100).toFixed(0)}% of the movement)`
                )
                .join('\n'),
          },
        ],
      },
      { signal: AbortSignal.timeout(30000) }
    );

    const explanation = completion.choices[0]?.message?.content?.trim();
    if (!explanation) {
      return NextResponse.json({ explanation: deterministic(body), isFallback: true });
    }
    return NextResponse.json({ explanation, isFallback: false });
  } catch {
    // Never 500 — an advisory surface must degrade, not break the page.
    try {
      const retry = RequestSchema.safeParse(await req.clone().json());
      if (retry.success) {
        return NextResponse.json({ explanation: deterministic(retry.data), isFallback: true });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json(
      { explanation: 'Attribution narration is unavailable.', isFallback: true },
      { status: 200 }
    );
  }
}
