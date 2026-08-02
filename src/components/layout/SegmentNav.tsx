'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sectionForPath } from '@/lib/navigation/taxonomy';
import { useRole } from '@/components/auth/RoleGate';
import { canAny } from '@/lib/auth/permissions';

/**
 * Second-level navigation — the segments inside the current section.
 *
 * This is the other half of the sidebar consolidation: the rail names five
 * sections, and this bar reveals the modules within whichever one you have
 * entered. Rendered from the same taxonomy, filtered by the same RBAC
 * predicate, so a segment the lens cannot open never appears here either.
 *
 * Hidden entirely when a section has only one visible segment — a tab bar
 * with a single tab is chrome that teaches nothing.
 */
export function SegmentNav() {
  const pathname = usePathname();
  const role = useRole();
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const section = sectionForPath(pathname);

  const segments = useMemo(
    () => (section ? section.segments.filter((s) => canAny(role, s.permissions)) : []),
    [section, role]
  );

  // Keep the active segment in view on narrow viewports where the bar scrolls.
  useEffect(() => {
    if (!activeRef.current || !listRef.current) return;
    const el = activeRef.current;
    const box = listRef.current;
    const overflowsLeft = el.offsetLeft < box.scrollLeft;
    const overflowsRight = el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth;
    if (overflowsLeft || overflowsRight) {
      box.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' });
    }
  }, [pathname]);

  if (!section || segments.length < 2) return null;

  return (
    <div className="no-print border-b border-border bg-background/80 backdrop-blur-xl sticky top-[88px] z-30">
      <div className="max-w-page mx-auto w-full px-4 lg:px-8">
        <div className="flex items-center gap-3 py-2.5">
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shrink-0">
            {section.label}
          </span>
          <span className="hidden sm:block h-3.5 w-px bg-border shrink-0" aria-hidden="true" />

          <div
            ref={listRef}
            className="flex-1 min-w-0 overflow-x-auto scrollbar-none"
          >
            <nav aria-label={`${section.label} modules`}>
              <ul className="flex items-center gap-1 w-max">
                {segments.map((seg) => {
                  const isActive =
                    seg.href === '/' ? pathname === '/' : pathname.startsWith(seg.href);
                  const Icon = seg.icon;
                  return (
                    <li key={seg.href}>
                      <Link
                        ref={isActive ? activeRef : undefined}
                        href={seg.href}
                        aria-current={isActive ? 'page' : undefined}
                        title={seg.desc}
                        className={`segment-pill group inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs whitespace-nowrap transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                            isActive ? '' : 'group-hover:scale-110'
                          }`}
                          aria-hidden="true"
                        />
                        {seg.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
