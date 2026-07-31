'use client';

import React from 'react';
import BoardDebatePanel from '@/components/ai/BoardDebatePanel';
import { Users } from 'lucide-react';

export default function BoardDebatePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Autonomous C-Suite Board Debate Swarm
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulate a live Capital Expenditure Committee debate between CFO, COO, CRO, and Strategy Director personas.
          </p>
        </div>
      </div>

      <BoardDebatePanel />
    </div>
  );
}
