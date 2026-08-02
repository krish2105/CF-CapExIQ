'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { useTheme } from 'next-themes';
import { ALL_SEGMENTS } from '@/lib/navigation/taxonomy';
import { canAny, roleLabel } from '@/lib/auth/permissions';
import { Search, Printer, Sun, Moon, X, Lock, CornerDownLeft } from 'lucide-react';

/**
 * Command palette.
 *
 * Previously carried its own hardcoded list of 24 routes — a third copy of
 * the navigation, already drifted from the sidebar's 31 (it was missing the
 * whole AI Intelligence group and named several routes differently). It now
 * derives from the shared taxonomy, so a new module appears here for free
 * and cannot go stale.
 *
 * Also filtered by the Executive Lens: offering a keyboard shortcut to a
 * route the role will refuse to render is a dead end, and search results are
 * exactly where a user would otherwise discover the restriction by accident.
 */

interface Action {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const setTheme = useTheme().setTheme;
  const selectedRole = useFinancialStore((s) => s.selectedRole);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setCursor(0);
  }, []);

  const routes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_SEGMENTS.filter((s) => canAny(selectedRole, s.permissions)).filter(
      (s) =>
        !q ||
        s.label.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.sectionLabel.toLowerCase().includes(q)
    );
  }, [query, selectedRole]);

  const hiddenCount = useMemo(
    () => ALL_SEGMENTS.filter((s) => !canAny(selectedRole, s.permissions)).length,
    [selectedRole]
  );

  const actions = useMemo<Action[]>(() => {
    const all: Action[] = [
      {
        id: 'theme-light',
        label: 'Switch to Parchment (light)',
        hint: 'Theme',
        icon: Sun,
        run: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        label: 'Switch to Midnight (dark)',
        hint: 'Theme',
        icon: Moon,
        run: () => setTheme('dark'),
      },
      {
        id: 'print',
        label: 'Printable Investment Report',
        hint: 'Export',
        icon: Printer,
        run: () => router.push('/printable-report'),
      },
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter((a) => a.label.toLowerCase().includes(q)) : all;
  }, [query, router, setTheme]);

  /** One flat list so ↑/↓ traverses routes and actions as a single sequence. */
  const flat = useMemo(
    () => [
      ...routes.map((r) => ({ kind: 'route' as const, key: r.href, run: () => router.push(r.href) })),
      ...actions.map((a) => ({ kind: 'action' as const, key: a.id, run: a.run })),
    ],
    [routes, actions, router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((p) => !p);
        return;
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = flat[cursor];
        if (target) {
          target.run();
          close();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, flat, cursor, close]);

  // Reset the cursor whenever the result set changes under it.
  useEffect(() => setCursor(0), [query]);

  // Keep the highlighted row scrolled into view during keyboard traversal.
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, isOpen]);

  if (!isOpen) return null;

  const activeId = flat[cursor]?.key;

  return (
    <div
      className="fixed inset-0 z-[80] bg-obsidian/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-reveal-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={close}
    >
      <div
        className="bg-popover border border-border-strong text-popover-foreground rounded-card max-w-xl w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-border p-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules and actions…"
            aria-label="Search modules and actions"
            aria-controls="cmdk-results"
            aria-activedescendant={activeId ? `cmdk-${activeId}` : undefined}
            className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none font-medium"
            autoFocus
          />
          <button
            onClick={close}
            aria-label="Close command palette"
            className="p-1 text-muted-foreground hover:text-foreground rounded-card shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} id="cmdk-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2 space-y-0.5 text-xs">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] px-2 py-1.5">
            Modules ({routes.length})
          </p>

          {routes.length === 0 && (
            <p className="px-3 py-3 text-[11px] text-muted-foreground">
              No module matches “{query}” in the {roleLabel(selectedRole)} lens.
            </p>
          )}

          {routes.map((r, i) => {
            const Icon = r.icon;
            const active = cursor === i;
            return (
              <button
                key={r.href}
                id={`cmdk-${r.href}`}
                role="option"
                aria-selected={active}
                data-active={active}
                onMouseEnter={() => setCursor(i)}
                onClick={() => {
                  router.push(r.href);
                  close();
                }}
                className={`w-full px-3 py-2 rounded-card text-left flex items-center gap-3 transition-colors ${
                  active ? 'bg-muted text-foreground' : 'hover:bg-muted/60'
                }`}
              >
                <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{r.label}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {r.sectionLabel} · {r.desc}
                  </span>
                </span>
                {active && (
                  <CornerDownLeft className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}

          {actions.length > 0 && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] px-2 py-1.5 pt-3">
              Quick actions
            </p>
          )}
          {actions.map((a, i) => {
            const idx = routes.length + i;
            const active = cursor === idx;
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                id={`cmdk-${a.id}`}
                role="option"
                aria-selected={active}
                data-active={active}
                onMouseEnter={() => setCursor(idx)}
                onClick={() => {
                  a.run();
                  close();
                }}
                className={`w-full px-3 py-2 rounded-card text-left flex items-center gap-3 transition-colors ${
                  active ? 'bg-muted text-foreground' : 'hover:bg-muted/60'
                }`}
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="flex-1 font-medium">{a.label}</span>
                <span className="text-[10px] text-muted-foreground">{a.hint}</span>
              </button>
            );
          })}

          {hiddenCount > 0 && (
            <p className="flex items-start gap-1.5 px-3 pt-3 pb-1 text-[10px] text-muted-foreground leading-relaxed border-t border-border mt-2">
              <Lock className="h-3 w-3 mt-px shrink-0" aria-hidden="true" />
              <span>
                {hiddenCount} module{hiddenCount === 1 ? '' : 's'} hidden by the{' '}
                {roleLabel(selectedRole)} lens.
              </span>
            </p>
          )}
        </div>

        <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
};
