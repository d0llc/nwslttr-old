# Router - Edge Redirect Worker

Cloudflare Worker handling newsletter link redirects. <50ms globally, 200k+ redirects/day.

## Architecture

**Two-stage lookup**: KV cache (90% hits) → PostgreSQL fallback
**Three-tier caching**: Edge (1hr) → KV (7d) → DB (permanent)
**Performance tracking**: Every request logs latency to Analytics Engine

## Key Decisions

1. **Single file** - One job, no abstractions needed
2. **Short cache keys** (`u`, `i`, `s`, `p`) - Saves KV storage at scale
3. **Email-first subscriber ID** - Some platforms only provide email
4. **8-char UUID truncation** - Short URLs > theoretical collision risk
5. **Empty catch blocks** - Analytics never blocks redirects
6. **Bot score < 30** - Cloudflare's documented threshold

## Cloudflare Worker Patterns

These patterns follow CF docs/examples:

- `ctx.waitUntil()` for non-blocking operations
- Empty catch blocks for analytics (never block user requests)
- `(cf as any)?.botManagement?.score` - CF's types are incomplete
- Bot score < 30 = bot traffic (per CF docs)
- Analytics Engine writes in try-catch blocks

## Performance Queries

```sql
-- P99 latency check
SELECT percentile(double2, 0.99) as p99_ms
FROM redirect_metrics
WHERE timestamp > now() - interval '1 hour'

-- Cache hit rate
SELECT countIf(blob3 = 'cache_hit') / count() as hit_rate
FROM redirect_metrics
```

## Development

```bash
pnpm dev      # Local development
pnpm test     # Run tests
pnpm deploy   # Deploy to Cloudflare
```

## Bindings (wrangler.toml)

- `CACHE` - KV namespace for redirect caching
- `DATABASE` - Hyperdrive connection to PostgreSQL
- `QUEUE` - Click tracking queue with DLQ
- `ANALYTICS` - Analytics Engine for metrics
- `RATE_LIMITER` - 1000/min production limit

## Remember

Speed > Perfect tracking. This worker does one thing well: redirect fast.
