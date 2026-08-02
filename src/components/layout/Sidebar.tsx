'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, Lock } from 'lucide-react';
import { NAV_SECTIONS, sectionForPath } from '@/lib/navigation/taxonomy';
import { useRole } from '@/components/auth/RoleGate';
import { canAny, roleLabel } from '@/lib/auth/permissions';

/**
 * Primary navigation — five sections, not thirty-one destinations.
 *
 * The rail now carries only section-level tabs. The routes inside a section
 * are revealed by <SegmentNav> once you enter it, which keeps the rail
 * scannable at a glance and means adding a route no longer lengthens the
 * global navigation.
 *
 * Sections whose every segment is out of the active Executive Lens are
 * removed entirely rather than shown disabled — a rail full of locked rows
 * is worse than a short rail.
 */
export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = useRole();

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => {
        const visible = section.segments.filter((seg) => canAny(role, seg.permissions));
        return { ...section, visibleSegments: visible };
      }).filter((s) => s.visibleSegments.length > 0),
    [role]
  );

  const activeSection = sectionForPath(pathname);
  const hiddenCount = NAV_SECTIONS.reduce(
    (n, s) => n + s.segments.filter((seg) => !canAny(role, seg.permissions)).length,
    0
  );

  const nav = (
    <nav className="p-4 space-y-1.5" aria-label="Primary">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Sections
      </p>

      <ul className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection?.id === section.id;
          // Enter the section at its own href when permitted, else at the
          // first segment this role can actually open.
          const entry =
            section.visibleSegments.find((s) => s.href === section.href)?.href ??
            section.visibleSegments[0].href;

          return (
            <li key={section.id}>
              <Link
                href={entry}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-start gap-3 rounded-card px-3 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? 'text-primary bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-nav bg-primary transition-all duration-300 ${
                    isActive ? 'h-7 opacity-100' : 'h-0 opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <Icon
                  className={`h-4 w-4 shrink-0 mt-0.5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-[13px] truncate ${
                      isActive ? 'font-medium' : ''
                    }`}
                  >
                    {section.label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {section.visibleSegments.length} module
                    {section.visibleSegments.length === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-3 pt-4 mt-3 border-t border-border space-y-2">
        {hiddenCount > 0 && (
          <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
            <Lock className="h-3 w-3 mt-px shrink-0" aria-hidden="true" />
            <span>
              {hiddenCount} module{hiddenCount === 1 ? '' : 's'} outside the{' '}
              <strong className="text-foreground font-medium">{roleLabel(role)}</strong> lens.
            </span>
          </p>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Press{' '}
          <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border-strong text-foreground">
            ⌘K
          </kbd>{' '}
          to search all modules.
        </p>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="md:hidden flex items-center justify-between border-b border-border px-4 py-2 no-print">
        <button
          onClick={() => setMobileOpen(true)}
          className="pill h-8"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="primary-nav-drawer"
        >
          <Menu className="h-3.5 w-3.5" aria-hidden="true" /> Navigate
        </button>
        <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
          <Search className="h-3 w-3" aria-hidden="true" /> ⌘K
        </span>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[70] flex no-print" id="primary-nav-drawer">
          <div
            className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm animate-reveal-fade"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[85vw] bg-surface border-r border-border overflow-y-auto animate-drawer-in">
            <div className="sticky top-0 flex justify-end p-3 bg-surface border-b border-border">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="icon-well h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="hidden md:block w-56 shrink-0 border-r border-border bg-surface no-print">
        <div className="sticky top-[88px] max-h-[calc(100vh-88px)] overflow-y-auto">{nav}</div>
      </aside>
    </>
  );
};
