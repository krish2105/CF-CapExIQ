'use client';

import { useEffect } from 'react';

/**
 * AutoReveal — blanket scroll-entrance for pages that were not hand-converted.
 *
 * Rather than editing ~22 inherited routes to wrap every card in <Reveal>,
 * this mounts once in the root layout and progressively enhances any
 * `.glass-panel` that is not already inside a manually-animated tree. It uses
 * one shared IntersectionObserver for the whole document, so the cost is O(1)
 * observers regardless of how many cards a page renders.
 *
 * Deliberately opt-out rather than opt-in: add `data-no-reveal` to any element
 * that should render immediately (e.g. print surfaces).
 *
 * Everything short-circuits under prefers-reduced-motion — no observer is
 * created and no element is ever hidden.
 */
export function AutoReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Deliberately does NOT exclude on `[data-reveal]` here — that attribute
    // is what makes an element invisible until revealed, so using it as the
    // "already processed" marker is unsafe: under React 18 StrictMode (dev),
    // effects run mount → cleanup → mount. The first pass tags elements and
    // starts observing them, its cleanup then disconnects that observer, and
    // if the *marker* were `data-reveal` the second pass's query would skip
    // those now-orphaned elements — permanently stuck at opacity:0, never
    // observed by the surviving observer. `bound` (below) is a plain local
    // variable instead, so it can never outlive its own effect instance.
    const SELECTOR = '.glass-panel:not([data-no-reveal])';
    const bound = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.setAttribute('data-revealed', 'true');
          observer.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );

    // Stagger cards that share a parent, so grids cascade rather than pop.
    const attach = () => {
      const groups = new Map<Element, HTMLElement[]>();

      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (bound.has(el)) return;
        if (el.getAttribute('data-revealed') === 'true') return;
        // Already governed by a hand-placed <Reveal> ancestor (e.g.
        // ChartCard, StatCard) — skip so it isn't double-gated behind two
        // independent opacity-0 triggers that both have to fire.
        if (el.parentElement?.closest('[data-reveal]')) return;

        const parent = el.parentElement;
        if (!parent) return;
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent)!.push(el);
      });

      groups.forEach((els) => {
        els.forEach((el, i) => {
          bound.add(el);
          if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
          el.style.setProperty('--reveal-delay', `${Math.min(i, 8) * 55}ms`);
          observer.observe(el);
        });
      });
    };

    attach();

    // Client-side route changes and async data both add new panels.
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
