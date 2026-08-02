'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { ROLE_DEFINITIONS, permissionCount } from '@/lib/auth/permissions';
import type { ExecutiveRole } from '@/lib/types/finance';
import { AlertTriangle, ArrowRight, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';

/**
 * Sign-in.
 *
 * The demo personas are listed on the page on purpose. These are seeded
 * academic accounts whose passwords are documented in the repository; hiding
 * them behind a "contact your administrator" would imply a secret that does
 * not exist, and would make the role model impossible to demonstrate.
 */

const DEMO_ACCOUNTS: Array<{ email: string; role: ExecutiveRole; name: string; title: string }> = [
  { email: 'ceo@novaretail.example', role: 'CEO', name: 'Amira Al Suwaidi', title: 'Chief Executive Officer' },
  { email: 'cfo@novaretail.example', role: 'CFO', name: 'Rashid Kamal', title: 'Chief Financial Officer' },
  { email: 'coo@novaretail.example', role: 'COO', name: 'Leena Haddad', title: 'Chief Operations Officer' },
  { email: 'cto@novaretail.example', role: 'CTO', name: 'Daniyal Rehman', title: 'Chief Technology Officer' },
  { email: 'committee@novaretail.example', role: 'Capital Committee', name: 'Capital Committee', title: 'Investment Governance Board' },
  { email: 'analyst@novaretail.example', role: 'Analyst', name: 'Priya Nair', title: 'Senior Investment Analyst' },
];

function demoPasswordFor(role: ExecutiveRole) {
  return `${role.toLowerCase().replace(/\s+/g, '-')}-capex-2026`;
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const setRole = useFinancialStore((s) => s.setRole);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      // A crashed route returns an HTML error page, not JSON. Parsing that
      // throws, and the outer catch then blames the network for a server-side
      // fault. Read the body defensively so the status code still gets a say.
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error ??
            `Sign-in failed (${res.status}). Check the server logs for the cause.`
        );
        setBusy(false);
        return;
      }

      // Mirror the authoritative role into the client store so existing
      // RoleGate call sites read the signed-in identity. The cookie remains
      // the source of truth — this copy is a render convenience, and the
      // middleware re-checks it on every navigation regardless.
      setRole(data.user.role as ExecutiveRole);
      router.replace(next);
      router.refresh();
    } catch {
      setError('Could not reach the sign-in service.');
      setBusy(false);
    }
  };

  const fill = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(demoPasswordFor(account.role));
    setError(null);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ---- Brand / context panel ---- */}
      <div className="relative hidden lg:flex flex-col justify-between border-r border-border p-10 xl:p-14 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              'radial-gradient(680px 360px at 10% 0%, rgba(204,145,102,0.10), transparent 65%)',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <p className="eyebrow mb-6">NovaRetail GCC</p>
          <h1 className="font-display text-[clamp(32px,3.4vw,46px)] leading-[1.08] text-foreground">
            Capital that <span className="gilded-text">earns its place</span> on the balance sheet.
          </h1>
          <p className="mt-6 text-sm text-muted-foreground max-w-[46ch] leading-relaxed">
            CapExIQ evaluates a five-year automated micro-fulfilment centre in Dubai. What you can
            see inside depends on the office you hold — the platform enforces need-to-know at the
            edge, not in the browser.
          </p>
        </div>

        <div className="relative space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-px" />
            <p>
              Sessions are signed, http-only and verified before a page renders. Modules outside
              your lens are unreachable by URL, not merely hidden.
            </p>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-px" />
            <p>
              NovaRetail GCC is a hypothetical entity for academic decision modelling. Accounts
              below are seeded demonstration personas.
            </p>
          </div>
        </div>
      </div>

      {/* ---- Form panel ---- */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-7">
          <div className="lg:hidden">
            <p className="eyebrow mb-2">NovaRetail GCC</p>
            <h1 className="font-display text-[30px] leading-tight text-foreground">CapExIQ</h1>
          </div>

          <div>
            <h2 className="font-display text-[26px] leading-tight text-foreground">Sign in</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Access is granted against the authority of your role.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cfo@novaretail.example"
                className="w-full bg-card border border-border rounded-card px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-card border border-border rounded-card px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-card border border-destructive/40 bg-destructive-soft px-3 py-2 text-xs text-destructive"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full justify-center disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* ---- Demo personas ---- */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Demonstration accounts
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Select a persona to autofill. Each sees a different subset of the platform — the
              module count shows how much authority the role carries.
            </p>

            <ul className="grid gap-1.5">
              {DEMO_ACCOUNTS.map((acct) => (
                <li key={acct.email}>
                  <button
                    type="button"
                    onClick={() => fill(acct)}
                    className="w-full flex items-center justify-between gap-3 rounded-card border border-border bg-card hover:bg-muted px-3 py-2 text-left transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground truncate">
                        {ROLE_DEFINITIONS[acct.role].label}
                      </span>
                      <span className="block text-[10px] font-mono text-muted-foreground truncate">
                        {acct.email}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      {permissionCount(acct.role)} perms
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

