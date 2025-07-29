# nwslttr.io - Newsletter Link Tracking Service

A privacy-focused link tracking service designed for newsletter authors to understand their audience engagement through fast, reliable short links.

## Overview

nwslttr.io replaces long URLs in newsletters with trackable short links (`nwslttr.io/Kx9mN2`) that provide detailed analytics while maintaining <50ms global redirect performance.

### Core Features

- **Link Shortening**: Convert long URLs to 6-character Base58 short codes
- **Fast Redirects**: Global edge redirects via Cloudflare Workers
- **Privacy-First Analytics**: GDPR-compliant tracking without storing personal data
- **Newsletter Organization**: Links organized by newsletter issues
- **Browser Extension**: One-click link replacement for newsletter platforms

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM, Auth.js v5
- **Database**: PostgreSQL on Railway
- **Edge**: Cloudflare Workers + KV Storage
- **Infrastructure**: Railway (app), Cloudflare (redirects)
- **Payments**: Stripe
- **Monitoring**: Sentry

## Architecture

### Domain Strategy

- `nwslttr.io` - Pure redirect service (Cloudflare Workers)
- `nwslttr.app` - Dashboard, analytics, API (Next.js on Railway)

### URL Structure

```
https://nwslttr.io/Kx9mN2  # Standard short link
https://nwslttr.io/my-link # Custom alias (min 4 chars)
```

- **Character Set**: Base58 (excludes 0, O, I, l for readability)
- **Length**: 6 characters = 38 billion combinations
- **Redirect**: 302 status (allows destination updates)

### Data Model

```
User (individual accounts)
  └── Newsletter (single initially, multi-newsletter later)
       └── Issue (e.g., "Issue #47")
            └── Link (trackable short links)
                 └── Click Event (analytics)
```

### Privacy & Analytics

- **IP Handling**: Hashed immediately with daily rotating salt
- **Data Collected**: Timestamp, country, device, browser, OS, referrer
- **NOT Collected**: Raw IPs, cookies, fingerprints
- **Retention**: 90 days full data, then aggregated

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Cloudflare account

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
pnpm db:migrate

# Start development
pnpm dev
```

### Project Structure

```
apps/
  web/        # Next.js dashboard
  router/     # Cloudflare Worker for redirects
  extension/  # Browser extension
packages/
  db/         # Database schemas (Drizzle)
  types/      # Shared TypeScript types
  utils/      # Shared utilities
  test-utils/ # Testing utilities
  ui/         # Shared UI components
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Development Workflow

1. **TDD Approach**: Write tests first, then implementation
2. **Atomic Commits**: One logical change per commit
3. **Conventional Commits**: `feat:`, `fix:`, `refactor:`, etc.
4. **Pre-commit Hooks**: Automatic linting and formatting

## Deployment

### Production Infrastructure

- **Application**: Railway (Next.js, PostgreSQL)
- **Edge Workers**: Cloudflare Workers
- **CDN/Cache**: Cloudflare KV
- **Domains**: nwslttr.io, nwslttr.app

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...
AUTH_URL=https://nwslttr.app

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
KV_NAMESPACE_ID=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Sentry
SENTRY_DSN=...
```

## Performance Goals

- **Redirect Latency**: <50ms globally
- **Dashboard Load**: <2s
- **Uptime**: 99.9% for redirects
- **Scale**: 10M+ redirects/day

## Business Model

- **Free Tier**: 100 links/month, 5 issues/month
- **Pro**: 1,000 links/month, 50 issues/month
- **Enterprise**: 10,000+ links/month, unlimited issues

## Development

- [Open Issues](https://github.com/d0llc/nwslttr/issues)
- [Discussions](https://github.com/d0llc/nwslttr/discussions)

## License

Copyright © 2024 nwslttr.io. All rights reserved.

---

**Status**: Early development - Building foundation with TDD approach
