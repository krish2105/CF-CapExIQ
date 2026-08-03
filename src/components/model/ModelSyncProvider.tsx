'use client';

import React, { useEffect, useRef } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import {
  ModelSync,
  fetchModel,
  setActiveSync,
  type ServerProfile,
  type SyncStatus,
} from '@/lib/store/modelSync';
import { useRole } from '@/components/auth/RoleProvider';
import { AlertTriangle, Loader2, Lock, WifiOff } from 'lucide-react';

/**
 * Connects the store to the shared model.
 *
 * Mounted once in `AppChrome`. Loads the server's snapshot on mount, owns the
 * debounced write queue, and reconciles whatever comes back.
 *
 * There is no polling. A capital model is edited deliberately and rarely, so
 * a timer would spend the whole session issuing requests to discover nothing
 * changed; the conflict path already catches the case that matters — two
 * people editing at once — and tells the loser rather than letting them
 * overwrite work they never saw. Live multi-user presence is a websocket
 * feature, not a polling one, and is not what this needs today.
 */
export function ModelSyncProvider({ children }: { children: React.ReactNode }) {
  const role = useRole();
  const applySnapshot = useFinancialStore((s) => s.applyServerSnapshot);
  const setSyncStatus = useFinancialStore((s) => s.setSyncStatus);
  const activeProfileId = useFinancialStore((s) => s.activeProfileId);
  const syncRef = useRef<ModelSync | null>(null);

  // ---- reload the shared model -----------------------------------------
  const reload = useRef(async () => {
    try {
      const snapshot = await fetchModel();
      if (!snapshot) {
        // 401/403 — signed out, or a role without `assumptions.view`. Not an
        // error state: the local defaults stay on screen and stay read-only.
        setSyncStatus({ state: 'idle' });
        return;
      }
      applySnapshot(snapshot);

      const active = snapshot.profiles.find(
        (p) => p.id === (snapshot.workspace.activeProfileId ?? p.id)
      );
      syncRef.current?.setProfile(active?.id ?? null, active?.version);
    } catch {
      setSyncStatus({
        state: 'offline',
        message: 'Could not load the shared model — showing the last known values.',
      });
    }
  });

  useEffect(() => {
    const sync = new ModelSync({
      onSaved: (profile: ServerProfile) => {
        setSyncStatus({
          state: 'idle',
          version: profile.version,
          lastSyncedAt: new Date().toISOString(),
        });
      },
      onRejected: (status: SyncStatus) => {
        setSyncStatus(status);
        // A conflict means the server has changes this tab has not seen.
        // Pulling them in is the only way the next write can succeed, and it
        // shows the user what they were about to overwrite.
        if (status.state === 'conflict') void reload.current();
      },
    });

    syncRef.current = sync;
    setActiveSync(sync);
    void reload.current();

    return () => {
      // Flush before tearing down so an edit made a few hundred milliseconds
      // before a navigation is not lost to the debounce window.
      void sync.flushNow();
      setActiveSync(null);
      syncRef.current = null;
    };
    // Re-run on sign-in/out: the snapshot a signed-out tree can read is
    // different from the one a CFO can, and the sync engine must not keep
    // writing under an identity that has changed.
  }, [role, applySnapshot, setSyncStatus]);

  // Keep the engine pointed at whatever profile the workspace switched to.
  useEffect(() => {
    const profile = useFinancialStore
      .getState()
      .projectProfiles.find((p) => p.id === activeProfileId);
    if (profile) syncRef.current?.setProfile(activeProfileId);
  }, [activeProfileId]);

  // A close mid-debounce would otherwise drop the last edit silently.
  useEffect(() => {
    const flush = () => void syncRef.current?.flushNow();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return (
    <>
      <SyncIndicator />
      {children}
    </>
  );
}

/**
 * Surfaces sync state, and only when it is worth interrupting for.
 *
 * `idle` renders nothing. A permanent "saved" badge trains people to ignore
 * the one place that will later tell them their change did not land.
 */
function SyncIndicator() {
  const status = useFinancialStore((s) => s.syncStatus);

  if (status.state === 'idle' || status.state === 'loading') return null;

  const tone =
    status.state === 'conflict'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : status.state === 'forbidden'
        ? 'border-border bg-muted text-muted-foreground'
        : 'border-destructive/40 bg-destructive/10 text-destructive';

  const Icon =
    status.state === 'conflict'
      ? AlertTriangle
      : status.state === 'forbidden'
        ? Lock
        : status.state === 'saving'
          ? Loader2
          : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-start gap-2.5 max-w-md rounded-card border px-4 py-2.5 text-xs shadow-lg ${tone}`}
      data-no-reveal
    >
      <Icon className={`h-4 w-4 shrink-0 mt-px ${status.state === 'saving' ? 'animate-spin' : ''}`} />
      <p className="leading-relaxed">{status.message ?? 'Synchronising the shared model…'}</p>
    </div>
  );
}
