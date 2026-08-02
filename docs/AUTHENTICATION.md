# Authentication & Role-Based Access

## What changed

The Executive Lens used to be a **dropdown in the header**. Any visitor could
select "CFO" and read the funding structure, because the only thing between
them and it was a value in client-side state. The permission matrix existed but
decided nothing.

Authority now comes from a **signed session cookie**, verified in Next.js
middleware **before the requested page renders**. Modules outside your role are
unreachable by URL, not merely hidden from the navigation.

## Demo accounts

Password pattern: `<role>-capex-2026` (role lowercased, spaces → hyphens).

| Email | Role | Persona | Permissions |
|---|---|---|---|
| `ceo@novaretail.example` | CEO | Amira Al Suwaidi | 9 |
| `cfo@novaretail.example` | CFO | Rashid Kamal | 18 |
| `coo@novaretail.example` | COO | Leena Haddad | 10 |
| `cto@novaretail.example` | CTO | Daniyal Rehman | 8 |
| `committee@novaretail.example` | Capital Committee | Governance Board | 14 |
| `analyst@novaretail.example` | Analyst | Priya Nair | 17 |

Example: `cfo@novaretail.example` / `cfo-capex-2026`

These are published deliberately. They are seeded academic personas, and
pretending a demo credential is a secret would be theatre. The login page lists
them for the same reason.

## What each role cannot reach

Access is genuinely differentiated — `tests/auth.test.ts` asserts that no two
roles have identical reach:

- **CEO** — no cash-flow schedule, no sensitivity/Monte Carlo, no RFP negotiation. Holds sole signing authority alongside CFO and the Committee.
- **CFO** — the broadest financial access, including funding and audit. No RFP negotiation, no digital twin.
- **COO** — operations, vendors and RFP negotiation. **No funding structure, no approval authority, no advanced metrics.**
- **CTO** — capacity, digital twin, vendor fit. **No cash-flow schedule, no funding, no approvals.**
- **Capital Committee** — full read for the approval decision, **no write access** to assumptions.
- **Analyst** — deepest modelling access including edit rights, but **no signing authority and no board materials**.

## How it works

```
Browser ──▶ middleware.ts (Edge)
              │  verify HMAC-SHA256 cookie
              │  ├─ no session   → redirect /login?next=…
              │  ├─ lacks perm   → rewrite /forbidden?from=…
              │  └─ ok           → forward x-capexiq-role header
              ▼
           Page renders
```

**Session token** — `src/lib/auth/session.ts`. HMAC-SHA256 over a compact JSON
payload, built on Web Crypto so the same verify path runs at the edge. Not a
JWT library: the payload is four fields and HS256 is the only accepted
algorithm, so a dependency would add the `alg: none` and algorithm-confusion
bug families without adding capability. Signature comparison is constant-time.

**Cookie** — `httpOnly`, `sameSite=lax`, `secure` in production, 8-hour TTL.
JavaScript cannot read it, so client state cannot forge a role.

**Passwords** — PBKDF2-SHA256, 210,000 iterations, per-user salt. No plaintext
in the repository (asserted by test).

**Login hardening** — identical response for unknown-account and wrong-password
(no enumeration oracle for a directory of named executives); PBKDF2 runs even
on unknown emails so timing does not leak existence; rate limited to 20
attempts/minute per IP.

**Unknown routes fail closed** — a page with no entry in `ROUTE_PERMISSIONS`
requires a session. New pages ship protected by default, not public.

**No drift** — `ROUTE_PERMISSIONS` duplicates the nav taxonomy (which imports
lucide-react and must not enter the Edge bundle). `tests/auth.test.ts` fails if
the two diverge.

## Configuration

```bash
# Required in production — the app refuses to sign sessions without it.
AUTH_SECRET="<32+ random bytes, base64url>"

# Optional: replace the seeded directory entirely.
CAPEXIQ_USERS='[{"id":"...","email":"...","role":"CFO","passwordHash":"pbkdf2$..."}]'
```

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Honest limitations

This is a real authorisation boundary, but it is not production identity
infrastructure:

- **No revocation.** Signing out clears the cookie; it does not invalidate an already-issued token. A copied token stays valid until its 8-hour expiry.
- **No MFA, no password reset, no lockout** beyond the rate limit.
- **A leaked `AUTH_SECRET` forges any role.** There is no key rotation or `kid` header.
- **Static directory.** No user management, no provisioning, no offboarding.
- **API route handlers are authenticated but not individually permission-checked.** Middleware confirms a valid session on `/api/*`; it does not enforce per-endpoint permissions. Before this handles anything genuinely confidential, each handler must re-check its own permission — the client-side `RoleGate` is presentation, not enforcement.

For an academic capital-budgeting demonstrator these are acceptable. For
anything real, replace the directory with an identity provider.
