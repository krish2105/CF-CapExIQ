'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SegmentNav } from '@/components/layout/SegmentNav';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import VoiceCopilotWidget from '@/components/ai/VoiceCopilotWidget';
import { RoleGate } from '@/components/auth/RoleGate';
import { ModelSyncProvider } from '@/components/model/ModelSyncProvider';
import { AutoReveal } from '@/components/ui/AutoReveal';
import { ScrollProgress } from '@/components/ui/ScrollProgress';

/**
 * Application shell.
 *
 * Sign-in renders bare — a navigation rail advertising modules the visitor
 * cannot open, wrapped around the form that decides whether they may open
 * anything, is both a leak of the module inventory and visually absurd.
 */
const BARE_ROUTES = new Set(['/login']);

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <ModelSyncProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] btn-primary"
      >
        Skip to content
      </a>

      <Header />
      <CommandPalette />
      {/*
        The voice copilot proposes assumption changes, and `/api/ai/voice-intent`
        requires `assumptions.edit` for that reason. Rendering the microphone
        for a role that cannot use it offers a control that fails on press.
      */}
      <RoleGate require={['assumptions.edit']}>
        <VoiceCopilotWidget />
      </RoleGate>
      <AutoReveal />
      <ScrollProgress />

      <div className="relative z-10 flex-1 flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <SegmentNav />
          <main
            id="main-content"
            className="register-app flex-1 min-w-0 px-4 py-6 lg:px-8 lg:py-8 max-w-page mx-auto w-full"
          >
            {children}
          </main>
        </div>
      </div>
    </ModelSyncProvider>
  );
}
