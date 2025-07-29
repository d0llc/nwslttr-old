# nwslttr.io

Newsletter Intelligence Platform. Track who reads what, understand reader interests, optimize content.

## Vision

Build Common Room for newsletters. Every newsletter creator should know:
- Which readers care about which topics
- What content drives engagement
- When readers are losing interest
- How to optimize for their audience

## Core Product Flow

1. **Author** forwards draft → uniquestring@nwslttr.io
2. **System** analyzes content, generates smart links
3. **Author** replaces links (manual or browser extension)
4. **Readers** click links in newsletter
5. **System** builds reader intelligence profiles
6. **Author** gets insights: "Readers who like X also engage with Y"

## Architecture

**Two domains, clear separation**:
- `nwslttr.io` - Pure redirects (<50ms globally)
- `nwslttr.app` - Dashboard, analytics, intelligence

**Data model (intentionally hierarchical)**:
```
User (newsletter creator)
└── Newsletter (their publication)
    └── Issue (single send)
        └── Link (trackable URL)
            └── Click (reader action)
                └── Reader Profile (intelligence)
```

**Why this stack**:
- Cloudflare Workers: Global <50ms redirects
- PostgreSQL: Complex analytics queries
- Analytics Engine: Real-time dashboards
- KV Storage: Edge caching
- Hyperdrive: Connection pooling at edge

## Critical Concepts

**Merge Tags = Reader Identity**
- `{{ subscriber.email }}` from ConvertKit
- `*|EMAIL|*` from Mailchimp
- These connect clicks to actual readers
- Foundation of reader intelligence

**Dual Analytics Pattern**
- Analytics Engine: "Show me clicks right now"
- PostgreSQL: "Which readers evolved interests over 6 months"
- Both needed for different query patterns

**Privacy by Design**
- IP addresses hashed with daily salt
- No cookies, no fingerprinting
- GDPR compliant from day one
- Trust is our moat

## Development Philosophy

**Performance hierarchy**:
1. Redirect latency (must be <50ms)
2. Analytics accuracy (every click matters)
3. Dashboard speed (can be 2s)
4. Everything else

**Code principles**:
- Working > Perfect
- Measured > Assumed
- Simple > Clever
- Inline > Abstract (unless used 3+ places)

**Decision framework**:
Every feature must answer: "Does this help newsletter creators understand their readers better?"

## Technical Context

**Redirect flow** (apps/worker/src/index.ts):
1. Check KV cache → Found? Redirect
2. Miss? Check DB → Cache → Redirect
3. Track async (never block redirect)

**Reader profile building**:
- Click + merge tag = identified reader
- Click patterns = interest signals
- Time patterns = engagement health
- Cross-issue patterns = topic preferences

**Future capabilities**:
- AI content analysis
- A/B test suggestions
- Churn prediction
- Optimal send time
- Subject line optimization

## Environment Configuration

**We use two environment files:**
- `.env.local` - Local development (connects to dev database)
- `.env.production` - Production deployment
- `.env.example` - Template with all keys (committed to git)

**Key points:**
- No separate test environment - tests use dev database via `.env.local`
- Worker uses `wrangler.toml` for config, not .env files
- Next.js auto-loads `.env.local` in development
- All `.env*` files are gitignored except `.env.example`

## Remember

We're not building Bitly. We're building the intelligence layer for newsletters. Every newsletter has readers. No newsletter truly knows them. We change that.