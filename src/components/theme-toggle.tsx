'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

const OPTIONS = [
  { value: 'light', label: 'Parchment', icon: Sun },
  { value: 'dark', label: 'Midnight', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/**
 * Theme toggle — icon-only trigger to keep header weight down.
 * Icons are monochrome (reference: "icons are never filled with brand
 * colour"); the active row is marked with copper text, not a coloured icon.
 */
export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const current = mounted ? theme ?? 'system' : 'system';
  const ActiveIcon = OPTIONS.find((o) => o.value === current)?.icon ?? Monitor;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Select colour theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch theme"
        className="icon-well h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ActiveIcon className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-card border border-border-strong bg-popover p-1 animate-slide-down z-50">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = current === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTheme(value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 rounded-card px-3 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? 'text-primary bg-accent font-medium'
                    : 'text-popover-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {active && (
                  <span className="ml-auto h-1 w-1 rounded-pill bg-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
