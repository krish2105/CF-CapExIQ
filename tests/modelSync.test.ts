import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ModelSync,
  SYNC_DEBOUNCE_MS,
  setActiveSync,
  queueAssumptionChange,
  fetchModel,
} from '@/lib/store/modelSync';

const okProfile = (version = 2) => ({
  id: 'proj-a',
  name: 'Dubai MFC',
  description: '',
  assumptions: { discountRate: 0.095 },
  updatedAt: '2026-08-02T00:00:00.000Z',
  version,
});

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl as never);
  vi.stubGlobal('fetch', spy);
  return spy;
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );

let saved: unknown[];
let rejected: Array<{ state: string; message?: string }>;
let sync: ModelSync;

beforeEach(() => {
  vi.useFakeTimers();
  saved = [];
  rejected = [];
  sync = new ModelSync({
    onSaved: (p) => saved.push(p),
    onRejected: (s) => rejected.push(s),
  });
  sync.setProfile('proj-a', 1);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setActiveSync(null);
});

describe('debouncing', () => {
  it('coalesces a burst of changes into one request', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));

    // A slider drag emits a change per frame. One PATCH, not sixty.
    for (let i = 0; i < 60; i++) sync.queue({ discountRate: 0.1 + i / 1000 });

    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    expect(spy).toHaveBeenCalledTimes(1);
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.assumptions.discountRate).toBeCloseTo(0.159, 3);
  });

  it('merges different fields into a single payload', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));

    sync.queue({ discountRate: 0.1 });
    sync.queue({ automationEquipment: 20_000_000 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.assumptions).toEqual({ discountRate: 0.1, automationEquipment: 20_000_000 });
  });

  it('sends the version it last saw, so the server can detect a conflict', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    expect(JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string).expectedVersion).toBe(1);
  });

  it('advances to the version the server returns', async () => {
    mockFetch(() => json({ profile: okProfile(7) }));
    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    const spy = mockFetch(() => json({ profile: okProfile(8) }));
    sync.queue({ discountRate: 0.2 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    expect(JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string).expectedVersion).toBe(7);
  });

  it('sends nothing when nothing changed', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not queue when no profile is selected', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    sync.setProfile(null);
    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('flushNow', () => {
  it('sends immediately without waiting out the debounce', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    sync.queue({ discountRate: 0.1 });
    await sync.flushNow();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not double-send when the timer would also have fired', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    sync.queue({ discountRate: 0.1 });
    await sync.flushNow();
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('rejection handling', () => {
  it('reports a conflict and adopts the server version', async () => {
    mockFetch(() =>
      json({ error: 'conflict', message: 'Changed by someone else', actualVersion: 9 }, 409)
    );

    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    expect(rejected[0].state).toBe('conflict');

    // The next write must go out against their version, or it conflicts again
    // forever and the user can never save.
    const spy = mockFetch(() => json({ profile: okProfile(10) }));
    sync.queue({ discountRate: 0.2 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    expect(JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string).expectedVersion).toBe(9);
  });

  it('reports a read-only role rather than retrying', async () => {
    const spy = mockFetch(() => json({ error: 'forbidden' }, 403));
    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    expect(rejected[0].state).toBe('forbidden');
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS * 5);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('surfaces a validation error with the offending field', async () => {
    mockFetch(() => json({ error: 'invalid_request', issues: ['assumptions: rate out of range'] }, 400));
    sync.queue({ discountRate: 45 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    expect(rejected[0].message).toMatch(/rate out of range/);
  });

  it('re-queues the batch when the network fails, rather than losing it', async () => {
    mockFetch(() => Promise.reject(new Error('offline')));
    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    expect(rejected[0].state).toBe('offline');

    // The change must still be pending — a dropped connection must not
    // silently discard the user's edit.
    const spy = mockFetch(() => json({ profile: okProfile() }));
    await sync.flushNow();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.assumptions.discountRate).toBe(0.1);
  });

  it('keeps changes made during an in-flight request', async () => {
    let release: (v: Response) => void = () => {};
    mockFetch(() => new Promise<Response>((r) => (release = r)));

    sync.queue({ discountRate: 0.1 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);

    // Edited while the first PATCH is still open.
    sync.queue({ automationEquipment: 21_000_000 });
    release(new Response(JSON.stringify({ profile: okProfile() }), { status: 200 }));
    await vi.advanceTimersByTimeAsync(0);

    const spy = mockFetch(() => json({ profile: okProfile(3) }));
    await sync.flushNow();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.assumptions.automationEquipment).toBe(21_000_000);
  });
});

describe('module registry', () => {
  it('is a no-op when no provider is mounted', () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    setActiveSync(null);
    // Keeps the store's unit tests working without mounting React.
    expect(() => queueAssumptionChange({ discountRate: 0.1 })).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it('routes queued changes to the registered engine', async () => {
    const spy = mockFetch(() => json({ profile: okProfile() }));
    setActiveSync(sync);
    queueAssumptionChange({ discountRate: 0.13 });
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('fetchModel', () => {
  it('returns null for a caller who may not read the model', async () => {
    mockFetch(() => json({ error: 'forbidden' }, 403));
    expect(await fetchModel()).toBeNull();
  });

  it('returns null when signed out', async () => {
    mockFetch(() => json({ error: 'unauthorised' }, 401));
    expect(await fetchModel()).toBeNull();
  });

  it('throws on a server error so the caller can show a stale-data warning', async () => {
    mockFetch(() => json({ error: 'boom' }, 500));
    await expect(fetchModel()).rejects.toThrow(/Failed to load/);
  });
});
