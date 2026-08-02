'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, Database, FileText, Scale, ShieldCheck, Sigma, TriangleAlert } from 'lucide-react';
import type { Citation, SourceKind } from '@/lib/rag/types';

/**
 * Provenance strip under an assistant answer.
 *
 * Collapsed by default: the citation numbers in the prose are the primary
 * affordance, and a six-item source list expanded under every message buries
 * the conversation. Expanding shows the retrieved extract so a reader can
 * judge whether the passage actually supports the claim, which is the whole
 * point of citing it.
 */

const KIND_META: Record<SourceKind, { icon: React.ElementType; label: string; tone: string }> = {
  methodology: { icon: Sigma, label: 'Methodology', tone: 'text-info' },
  assumption: { icon: FileText, label: 'Assumption', tone: 'text-primary' },
  governance: { icon: ShieldCheck, label: 'Governance', tone: 'text-success' },
  limitation: { icon: TriangleAlert, label: 'Limitation', tone: 'text-warning' },
  'data-source': { icon: Database, label: 'Data source', tone: 'text-info' },
  guide: { icon: BookOpen, label: 'Guide', tone: 'text-muted-foreground' },
  scenario: { icon: Scale, label: 'Scenario', tone: 'text-primary' },
  'live-model': { icon: Sigma, label: 'Live model', tone: 'text-success' },
};

export function SourceCitations({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = React.useState(false);
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-border/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        {citations.length} source{citations.length === 1 ? '' : 's'}
      </button>

      {!open && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {citations.map((c) => {
            const meta = KIND_META[c.kind] ?? KIND_META.guide;
            return (
              <span
                key={c.n}
                title={`${c.source} — ${c.section}`}
                className="inline-flex items-center gap-1 rounded-card border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
              >
                <span className={`font-bold ${meta.tone}`}>[{c.n}]</span>
                <span className="max-w-[16ch] truncate">{c.source}</span>
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <ol className="mt-2 space-y-2">
          {citations.map((c) => {
            const meta = KIND_META[c.kind] ?? KIND_META.guide;
            const Icon = meta.icon;
            return (
              <li key={c.n} className="flex gap-2 text-[11px] leading-relaxed">
                <span className={`font-mono font-bold shrink-0 ${meta.tone}`}>[{c.n}]</span>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Icon className={`h-3 w-3 shrink-0 ${meta.tone}`} aria-hidden="true" />
                    {c.href ? (
                      <Link href={c.href} className="font-semibold text-foreground hover:text-primary underline underline-offset-2">
                        {c.source}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{c.source}</span>
                    )}
                    <span className="text-muted-foreground">· {c.section}</span>
                    <span className={`rounded border border-border px-1 text-[9px] font-mono uppercase ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{c.snippet}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
