import type { FinancialAssumptions } from '@/lib/types/finance';

/**
 * Client half of the shared capital model.
 *
 * The store keeps the same shape it always had — 24 pages read `assumptions`
 * and `getActiveScenarioResult()` during render, and changing that contract
 * would turn persistence into a 24-file refactor with the regression surface
 * to match. What changes is where the data comes from (the server, on mount)
 * and what a write does (updates locally, then reaches the API).
 *
 * WHY WRITES ARE OPTIMISTIC
 *
 * Assumption inputs are sliders and number fields. Waiting for a round trip
 * before the NPV moves makes the whole model feel broken, so the local value
 * is applied immediately and reconciled afterwards. The cost is that a
 * rejected write has to be visibly undone rather than silently dropped —
 * handled by `onRejected` below.
 *
 * WHY WRITES ARE DEBOUNCED
 *
 * Dragging one slider emits a change per frame. Sending each as a PATCH would
 * exhaust the endpoint's own rate limit in about a second, write a hundred
 * near-identical audit rows, and bury the one change a reader cares about.
 * Changes accumulate and flush on a trailing edge; the server-side "skip
 * unchanged fields" rule then collapses whatever survives.
 */

/** Trailing-edge delay. Long enough to cover a slider drag, short enough that
 *  a user who edits and immediately navigates away does not lose the change —
 *  `flushNow()` on unload covers the rest. */
export const SYNC_DEBOUNCE_MS = 700;

export type SyncState = 'idle' | 'loading' | 'saving' | 'offline' | 'conflict' | 'forbidden';

export interface SyncStatus {
  state: SyncState;
  message?: string;
  /** Server version last seen. Sent back to detect a concurrent edit. */
  version?: number;
  lastSyncedAt?: string;
}

export interface ServerProfile {
  id: string;
  name: string;
  description: string;
  assumptions: Record<string, unknown>;
  updatedAt: string;
  updatedByName?: string | null;
  version: number;
}

export interface ServerSnapshot {
  workspace: { activeProfileId: string | null; selectedScenario: string };
  profiles: ServerProfile[];
}

/**
 * The tab's active sync engine.
 *
 * A module-level registry rather than something the store holds, so
 * `updateAssumptions` can reach it without the store importing React or
 * `fetch` — which keeps the store unit-testable exactly as it was, and means
 * a test that never mounts the provider simply syncs nowhere instead of
 * failing.
 */
let active: ModelSync | null = null;

export function setActiveSync(sync: ModelSync | null): void {
  active = sync;
}

/** No-op when no provider is mounted (tests, or a signed-out tree). */
export function queueAssumptionChange(changes: Partial<FinancialAssumptions>): void {
  active?.queue(changes);
}

export function flushPendingChanges(): Promise<void> {
  return active?.flushNow() ?? Promise.resolve();
}

/** Load the shared model. Returns null when the caller may not read it. */
export async function fetchModel(): Promise<ServerSnapshot | null> {
  const res = await fetch('/api/profiles', { credentials: 'same-origin' });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Failed to load the shared model (HTTP ${res.status}).`);
  return (await res.json()) as ServerSnapshot;
}

export interface FlushCallbacks {
  /** Applied on success — the authoritative row after the write. */
  onSaved(profile: ServerProfile): void;
  /**
   * The write did not land. `assumptions` is the server's current truth, so
   * the caller can put the model back to something real rather than leaving
   * the optimistic value on screen.
   */
  onRejected(status: SyncStatus, serverAssumptions?: Record<string, unknown>): void;
}

/**
 * Accumulates changes and flushes them as one PATCH.
 *
 * One instance per browser tab, created by `ModelSyncProvider`. Deliberately
 * not a React hook: a slider's onChange must be able to reach it without a
 * re-render, and the pending buffer has to survive component churn.
 */
export class ModelSync {
  private pending: Partial<FinancialAssumptions> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private profileId: string | null = null;
  private version: number | undefined;

  constructor(private readonly callbacks: FlushCallbacks) {}

  setProfile(id: string | null, version?: number) {
    this.profileId = id;
    this.version = version;
  }

  get profile(): string | null {
    return this.profileId;
  }

  /** Queue a change. Safe to call at frame rate. */
  queue(changes: Partial<FinancialAssumptions>) {
    if (!this.profileId) return;

    Object.assign(this.pending, changes);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), SYNC_DEBOUNCE_MS);
  }

  /** Send immediately — page unload, or an explicit save. */
  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.inFlight || !this.profileId) return;

    const batch = this.pending;
    if (Object.keys(batch).length === 0) return;

    // Cleared before the await, so changes made during the request are queued
    // for the next flush rather than being dropped when this one succeeds.
    this.pending = {};
    this.inFlight = true;

    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(this.profileId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assumptions: batch,
          ...(this.version !== undefined ? { expectedVersion: this.version } : {}),
        }),
      });

      if (res.ok) {
        const { profile } = (await res.json()) as { profile: ServerProfile };
        this.version = profile.version;
        this.callbacks.onSaved(profile);
        return;
      }

      const body = await res.json().catch(() => ({}) as Record<string, unknown>);

      if (res.status === 409) {
        // Someone else changed the model. Adopt their version so the next
        // write is against current truth, and tell the user — silently
        // clobbering the edit they cannot see is the failure the version
        // column exists to prevent.
        this.version = typeof body.actualVersion === 'number' ? body.actualVersion : undefined;
        this.callbacks.onRejected({
          state: 'conflict',
          message:
            typeof body.message === 'string'
              ? body.message
              : 'Someone else changed this model. Reloading their version.',
          version: this.version,
        });
        return;
      }

      if (res.status === 403) {
        this.callbacks.onRejected({
          state: 'forbidden',
          message: 'Your role has read-only access to the capital model.',
        });
        return;
      }

      if (res.status === 400) {
        const issues = Array.isArray(body.issues) ? (body.issues as string[]).join('; ') : '';
        this.callbacks.onRejected({
          state: 'offline',
          message: `The server rejected that value${issues ? `: ${issues}` : '.'}`,
        });
        return;
      }

      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Network failure. The change stays applied locally and is put back on
      // the queue, so a dropped connection does not lose the user's work.
      this.pending = { ...batch, ...this.pending };
      this.callbacks.onRejected({
        state: 'offline',
        message: 'Could not reach the server — your change is saved locally and will retry.',
      });
    } finally {
      this.inFlight = false;
    }
  }
}
