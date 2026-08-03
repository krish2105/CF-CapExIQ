'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Gilded scroll-progress hairline pinned under the header.
 *
 * Written against the DOM directly rather than through React state: a
 * progress bar driven by setState re-renders on every scroll frame, which is
 * exactly the kind of work that shows up as input delay on a data-dense page.
 * A single transform write per rAF costs nothing and never invalidates the
 * React tree.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = barRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0;
      el.style.transform = `scaleX(${pct})`;
      el.style.opacity = pct > 0.004 ? '1' : '0';
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-px z-[55] pointer-events-none no-print"
      aria-hidden="true"
    >
      <div
        ref={barRef}
        className="scroll-progress-bar h-full w-full origin-left bg-gilded-solid opacity-0 transition-opacity duration-300"
      />
    </div>
  );
}
