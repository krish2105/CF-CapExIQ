# CapExIQ — Production Deployment Guide

## Production Build & Launch Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Execute unit & E2E tests
pnpm test
pnpm test:e2e

# 3. Compile Next.js production bundle
pnpm build

# 4. Launch production server
pnpm start
```
