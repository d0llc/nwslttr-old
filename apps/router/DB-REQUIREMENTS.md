# Router Database Integration Requirements

This document outlines the required changes to the router codebase to properly integrate with the new database schema.

## Critical Router-Side Changes

### 1. Queue Message ID for Idempotency ✅ FIXED

The router now passes the Cloudflare Queue message ID to prevent duplicate click processing.

**Implementation (FIXED in commit):**
```typescript
const clickRecords = chunk.map((msg) => ({
  messageId: msg.id,  // ✅ Added - Cloudflare's unique message ID
  linkId: msg.body.linkId,
  clickedAt: new Date(msg.body.clickedAt),
  ipCountry: msg.body.ipCountry,
  userAgent: msg.body.userAgent,
  referer: msg.body.referer,
  queryParams: msg.body.queryParams,
  mergeParams: msg.body.mergeParams,
}))
```

**Database Requirements:**
- Add `messageId` column to clicks table
- Add UNIQUE constraint on `messageId` to prevent duplicates
- Handle constraint violations gracefully (ON CONFLICT DO NOTHING)

### 2. Fix OR Query Performance Issue

PostgreSQL handles OR queries less efficiently than separate queries. The current implementation needs optimization.

**Current Implementation (INEFFICIENT):**
```typescript
const [link] = await db
  .select()
  .from(links)
  .where(or(eq(links.shortcode, path), eq(links.alias, path)))
  .limit(1)
```

**Required Implementation:**
```typescript
// Try shortcode first (most common case)
let [link] = await db
  .select()
  .from(links)
  .where(eq(links.shortcode, path))
  .limit(1)

// If not found, try alias
if (!link) {
  [link] = await db
    .select()
    .from(links)
    .where(eq(links.alias, path))
    .limit(1)
}

if (!link) {
  return new Response('Not found', { status: 404 })
}
```

### 3. Update Database Connection Configuration

Ensure the Hyperdrive connection respects Cloudflare Workers' 6-connection limit.

**Required Implementation:**
```typescript
// In createWorkerDB function
export function createWorkerDB(hyperdrive: Hyperdrive) {
  const sql = postgres(hyperdrive.connectionString, {
    max: 5,         // CRITICAL: Workers have 6 total connections, reserve 1
    prepare: true,  // Enable prepared statements for better performance
  })
  return drizzle(sql, { schema })
}
```

### 4. Handle Duplicate Message Processing

When a message is redelivered by the queue, handle the unique constraint violation gracefully.

**Required Implementation:**
```typescript
async queue(batch: MessageBatch<ClickData>, env: Env) {
  const db = createWorkerDB(env.HYPERDRIVE)
  
  for (const message of batch.messages) {
    try {
      await db.insert(clicks).values({
        messageId: message.id,  // This will fail on duplicates
        linkId: message.body.linkId,
        clickedAt: new Date(message.body.clickedAt),
        // ... other fields
      })
      
      message.ack() // Success
    } catch (error) {
      // PostgreSQL unique constraint violation
      if (error.code === '23505') {
        console.log(`Duplicate message ${message.id} - already processed`)
        message.ack() // Safe to acknowledge
      } else {
        console.error(`Failed to process click: ${error}`)
        message.retry() // Retry on other errors
      }
    }
  }
}
```

### 5. Update TypeScript Types

Add the message ID to the ClickData interface.

**Required Implementation:**
```typescript
interface ClickData {
  messageId: string      // ADD THIS
  linkId: string
  clickedAt: string
  ipCountry: string | null
  ipCity: string | null
  userAgent: string | null
  referer: string | null
  mergeParams: Record<string, string> | null
}
```

**Future Fields (NOT YET IMPLEMENTED):**
The database schema includes these fields for future privacy-configurable tracking:
```typescript
interface FutureClickData extends ClickData {
  // Click classification (to be implemented)
  clickType?: 'first' | 'refresh' | 'return' | 'bot'
  sessionId?: string
  secondsSincePrevious?: number
  
  // Advanced fingerprinting (to be implemented)
  ipHash?: string              // Hashed IP with daily salt
  deviceFingerprint?: string   // Combined device characteristics
}
```

These fields exist in the database schema but are NOT implemented in the router yet. They will be added in a future phase based on privacy requirements.

### 6. Queue Message Structure

Update the message sent to the queue to match what the handler expects.

**In the redirect handler:**
```typescript
// When queueing the click
await env.CLICKS_QUEUE.send({
  linkId: link.id,
  clickedAt: new Date().toISOString(),
  ipCountry: request.headers.get('CF-IPCountry'),
  ipCity: request.headers.get('CF-IPCity'),  
  userAgent: request.headers.get('User-Agent'),
  referer: request.headers.get('Referer'),
  mergeParams: extractMergeParams(url.searchParams),
  // Note: messageId is added by queue handler, not here
})
```

## Implementation Checklist

- [ ] Add `messageId` to ClickData interface
- [ ] Update queue handler to pass `message.id` to database
- [ ] Replace OR query with separate shortcode/alias lookups
- [ ] Add error handling for duplicate message processing (code 23505)
- [ ] Verify database connection uses `max: 5`
- [ ] Test idempotency by manually retrying queue messages
- [ ] Measure redirect performance to ensure <50ms p99

## Testing Strategy

1. **Idempotency Test:**
   - Send same message ID twice
   - Verify second attempt is acknowledged without error
   - Check database has only one click record

2. **Performance Test:**
   - Measure redirect lookup time
   - Should be <50ms for both shortcode and alias lookups
   - Monitor Hyperdrive connection pool usage

3. **Connection Limit Test:**
   - Simulate concurrent requests
   - Verify no connection exhaustion errors
   - Monitor that connections stay under 6 total

## Notes

- The database schema expects `messageId` as a required, unique field
- Cloudflare Queues guarantees at-least-once delivery, making idempotency critical
- The 5-connection limit leaves 1 connection for health checks or other operations
- Prepared statements improve performance and should be used for hot paths

## Privacy & Fingerprinting Strategy

The database schema includes fields for advanced tracking (ipHash, deviceFingerprint, clickType, sessionId) but these are **NOT implemented in the router yet**. This is intentional:

1. **Build the schema first** - Database has full capability
2. **Implement basics** - Just geo and user agent initially  
3. **Add fingerprinting later** - Based on privacy requirements and user consent
4. **Make it configurable** - Per-newsletter privacy settings

This approach allows us to:
- Start with minimal tracking
- Add advanced features without schema changes
- Comply with different privacy regulations
- Let newsletter creators choose their privacy level