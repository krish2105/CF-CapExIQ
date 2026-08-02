# CapExIQ — Security & Governance Policy

## 1. Client/Server Boundary Enforcement
- All external AI API credentials (`OPENAI_API_KEY`) are confined strictly to Next.js Route Handlers (`/api/ai/explain` and `/api/ai/recommend`). Zero key exposure on client bundles.

## 2. CSV Formula Injection Defense
- Automatic sanitization escapes leading `=`, `+`, `-`, `@` characters by prepending `'` on both CSV upload import and CSV download exports.

## 3. Data Privacy & PII Safeguards
- Zero personal customer data (PII) is processed or transmitted to AI models.
