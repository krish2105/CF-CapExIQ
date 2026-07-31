'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = mounted ? theme : 'system';

  const getThemeIcon = (t?: string) => {
    if (t === 'light') return <Sun className="h-3.5 w-3.5 text-amber-500" />;
    if (t === 'dark') return <Moon className="h-3.5 w-3.5 text-cyan-400" />;
    return <Monitor className="h-3.5 w-3.5 text-slate-400" />;
  };

  const getThemeLabel = (t?: string) => {
    if (t === 'light') return 'Light';
    if (t === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select color theme"
        title="Switch theme (Light, Dark, System)"
        className="px-2.5 py-1.5 rounded-lg bg-card text-card-foreground hover:bg-muted border border-border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {getThemeIcon(currentTheme)}
        <span>{getThemeLabel(currentTheme)}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 rounded-xl bg-card border border-border shadow-xl z-50 py-1 text-xs focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-left flex items-center gap-2 font-medium transition-colors ${
              currentTheme === 'light' ? 'bg-primary/10 text-primary font-bold' : 'text-card-foreground hover:bg-muted'
            }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-left flex items-center gap-2 font-medium transition-colors ${
              currentTheme === 'dark' ? 'bg-primary/10 text-primary font-bold' : 'text-card-foreground hover:bg-muted'
            }`}
          >
            <Moon className="h-3.5 w-3.5 text-cyan-400" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-left flex items-center gap-2 font-medium transition-colors ${
              currentTheme === 'system' ? 'bg-primary/10 text-primary font-bold' : 'text-card-foreground hover:bg-muted'
            }`}
          >
            <Monitor className="h-3.5 w-3.5 text-slate-400" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
};
