# Database Package Implementation Guide

**Status**: Database package to be implemented. Router redirect functionality exists but requires schema implementation.

**Architecture**: Edge-first newsletter intelligence platform with <50ms global redirects.

**Important**: The worker folder has been renamed to `router` to better reflect its purpose. However, the database package export `@repo/db/worker` remains unchanged as it refers to the worker-specific database connection function, not the folder name.

## Quick Start

```bash
# 1. Install dependencies
cd packages/db
pnpm install drizzle-orm postgres drizzle-kit

# 2. Generate initial migration
pnpm drizzle-kit generate

# 3. Apply migration to database
pnpm drizzle-kit migrate
```

## Core Architecture

### Two-Domain Strategy
- `nwslttr.io` - Pure redirects via Cloudflare Workers (<50ms globally)
- `nwslttr.app` - Dashboard and analytics via Next.js

### Data Hierarchy
```
User (newsletter creator)
└── Newsletter (publication)
    └── Issue (single send)
        └── Link (trackable URL)
            └── Click (reader interaction)
                └── Reader Profile (tier 1 only)
```

### Cache Architecture
```
Request → KV Cache → Hyperdrive → PostgreSQL
  ↓         ↓           ↓             ↓
<50ms    <100ms      <150ms        <200ms
```

## Critical Implementation Requirements

### 1. Hyperdrive Connection Management

```typescript
// Workers have 6 total connection limit - reserve 5 for Hyperdrive
export function createEdgeDB(hyperdrive: Hyperdrive) {
  const sql = postgres(hyperdrive.connectionString, {
    max: 5,         // Critical: Workers connection limit
    prepare: true,  // Hyperdrive supports prepared statements
  });
  return drizzle(sql, { schema });
}
```

### 2. Queue Message Idempotency

```typescript
// Cloudflare Queues delivers messages at-least-once
// Use message.id as idempotency key in clicks table
export const clicks = pgTable('clicks', {
  // ... other columns
  messageId: text('message_id').notNull().unique(), // Queue message.id
});

// In queue handler:
await db.insert(clicks).values({
  ...clickData,
  messageId: message.id, // Prevents duplicate processing
});
```

### 3. Optimized Redirect Lookups

```typescript
// PostgreSQL CAN use indexes with OR, but separate queries are cleaner
// Try shortcode first (most common), then alias
export async function findLink(identifier: string, db: Database) {
  // Try shortcode first
  const byShortcode = await db
    .select()
    .from(links)
    .where(eq(links.shortcode, identifier))
    .limit(1);
  
  if (byShortcode.length > 0) return byShortcode[0];
  
  // Fall back to alias
  const byAlias = await db
    .select()
    .from(links)
    .where(eq(links.alias, identifier))
    .limit(1);
  
  return byAlias[0];
}
```

### 4. Multi-Tenant Data Isolation

Since Drizzle doesn't support PostgreSQL RLS:
- All queries must include userId/newsletterId constraints
- Use repository pattern to enforce ownership
- TypeScript ensures required parameters

```typescript
// Repository pattern enforces ownership
export class LinkRepository {
  constructor(private db: Database, private userId: string) {}
  
  async findByNewsletter(newsletterId: string) {
    // Always includes ownership check
    return this.db
      .select()
      .from(links)
      .innerJoin(issues, eq(issues.id, links.issueId))
      .innerJoin(newsletters, eq(newsletters.id, issues.newsletterId))
      .where(and(
        eq(newsletters.id, newsletterId),
        eq(newsletters.userId, this.userId) // Enforced ownership
      ));
  }
}
```

## Database Schema

### Package Structure
```
packages/db/
├── drizzle/                  # Migrations (generated)
├── src/
│   ├── db/
│   │   ├── index.ts         # Connection exports
│   │   ├── schema/
│   │   │   ├── auth.ts      # Auth.js tables
│   │   │   ├── core.ts      # Business tables
│   │   │   ├── analytics.ts # Click tracking
│   │   │   ├── relations.ts # Type-safe joins
│   │   │   └── index.ts     # Schema exports
│   │   └── queries/
│   │       ├── links.ts     # Redirect queries
│   │       ├── analytics.ts # Dashboard queries
│   │       └── index.ts     # Query exports
│   └── index.ts             # Package exports
└── drizzle.config.ts        # Drizzle configuration
```

### Package Exports (package.json)
```json
{
  "exports": {
    "./schema": "./src/db/schema/index.ts",
    "./worker": "./src/db/index.ts",  // Edge/Worker connections (createEdgeDB)
    "./server": "./src/db/index.ts"   // Server connections (createServerDB)
  }
}
```
Note: Both router and parser workers import from `@repo/db/worker` to get the edge-optimized database connection.

### Auth Tables (Auth.js Compatible)

```typescript
// Auth.js uses mixed naming: camelCase for most fields, snake_case for OAuth
// We'll use snake_case throughout for PostgreSQL consistency
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth fields use snake_case in Auth.js
export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));
```

### Core Business Tables

```typescript
export const newsletters = pgTable('newsletters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domain: text('domain'), // Custom tracking domain
  platform: text('platform').notNull(), // 'convertkit', 'mailchimp', 'substack'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('newsletters_user_id_idx').on(table.userId),
}));

export const issues = pgTable('issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  newsletterId: uuid('newsletter_id').notNull().references(() => newsletters.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  subscriberCount: integer('subscriber_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  newsletterIdIdx: index('issues_newsletter_id_idx').on(table.newsletterId),
  sentAtIdx: index('issues_sent_at_idx').on(table.sentAt),
}));

export const links = pgTable('links', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  shortcode: varchar('shortcode', { length: 12 }).notNull().unique(),
  alias: varchar('alias', { length: 100 }).unique(),
  position: integer('position').notNull().default(0),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  shortcodeIdx: index('links_shortcode_idx').on(table.shortcode),
  aliasIdx: index('links_alias_idx').on(table.alias),
  issueIdIdx: index('links_issue_id_idx').on(table.issueId),
}));
```

### Analytics Tables

```typescript
export const clicks = pgTable('clicks', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  linkId: uuid('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
  
  // Queue idempotency - CRITICAL
  messageId: text('message_id').notNull().unique(),
  
  // Tier 1: Identified readers
  readerEmail: text('reader_email'),
  mergeParams: jsonb('merge_params').$type<Record<string, unknown>>(),
  
  // Tier 2: Anonymous patterns  
  ipCountry: text('ip_country'),
  ipCity: text('ip_city'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  
  // Click classification
  clickType: text('click_type'), // 'first', 'refresh', 'return', 'bot'
  sessionId: text('session_id'),
}, (table) => ({
  linkClickedIdx: index('clicks_link_clicked_idx').on(table.linkId, table.clickedAt.desc()),
  readerEmailIdx: index('clicks_reader_email_idx').on(table.readerEmail),
  messageIdIdx: index('clicks_message_id_idx').on(table.messageId),
}));

// Reader profiles for Tier 1 (platforms with merge tags)
export const readerProfiles = pgTable('reader_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  readerEmail: text('reader_email').notNull(),
  newsletterId: uuid('newsletter_id').notNull().references(() => newsletters.id, { onDelete: 'cascade' }),
  
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastClickedAt: timestamp('last_clicked_at').defaultNow().notNull(),
  clickCount: integer('click_count').notNull().default(0),
  
  interests: jsonb('interests').$type<string[]>().default([]),
  engagementScore: integer('engagement_score').notNull().default(50),
  lifecycle: text('lifecycle').notNull().default('new'), // 'new', 'engaged', 'at_risk', 'churned'
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  readerNewsletterUnique: unique().on(table.readerEmail, table.newsletterId),
  newsletterIdIdx: index('reader_profiles_newsletter_id_idx').on(table.newsletterId),
}));
```

### Drizzle Relations

```typescript
// Define relationships for type-safe joins
export const newslettersRelations = relations(newsletters, ({ one, many }) => ({
  user: one(users, {
    fields: [newsletters.userId],
    references: [users.id],
  }),
  issues: many(issues),
  readerProfiles: many(readerProfiles),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  newsletter: one(newsletters, {
    fields: [issues.newsletterId],
    references: [newsletters.id],
  }),
  links: many(links),
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  issue: one(issues, {
    fields: [links.issueId],
    references: [issues.id],
  }),
  clicks: many(clicks),
}));

export const clicksRelations = relations(clicks, ({ one }) => ({
  link: one(links, {
    fields: [clicks.linkId],
    references: [links.id],
  }),
}));
```

## Implementation Patterns

### Connection Management

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Edge: Cloudflare Workers with Hyperdrive
export function createEdgeDB(hyperdrive: Hyperdrive) {
  const sql = postgres(hyperdrive.connectionString, {
    max: 5,              // Workers connection limit
    prepare: true,       // Use prepared statements
  });
  return drizzle(sql, { schema });
}

// Server: Next.js with standard pooling
export function createServerDB(databaseUrl: string) {
  const sql = postgres(databaseUrl, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createEdgeDB>;
```

### Query Patterns

```typescript
// src/db/queries/links.ts
import { eq } from 'drizzle-orm';
import type { Database } from '../index';
import { links } from '../schema';

// Prepared statements for hot path
export function createLinkQueries(db: Database) {
  const findByShortcode = db
    .select()
    .from(links)
    .where(eq(links.shortcode, sql.placeholder('shortcode')))
    .prepare('findByShortcode');
    
  const findByAlias = db
    .select()
    .from(links)
    .where(eq(links.alias, sql.placeholder('alias')))
    .prepare('findByAlias');
    
  return { findByShortcode, findByAlias };
}

// Click tracking with idempotency
export async function trackClick(
  db: Database,
  clickData: ClickData,
  messageId: string
) {
  try {
    await db.insert(clicks).values({
      ...clickData,
      messageId, // Queue message.id prevents duplicates
    });
    return { success: true };
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return { success: true, duplicate: true };
    }
    throw error;
  }
}
```

### Queue Handler Pattern

```typescript
// In worker queue handler
async queue(batch: MessageBatch<ClickData>, env: Env) {
  const db = createEdgeDB(env.HYPERDRIVE);
  
  for (const message of batch.messages) {
    try {
      const result = await trackClick(
        db,
        message.body,
        message.id // Use Queue message ID
      );
      
      message.ack(); // Success or duplicate
    } catch (error) {
      console.error('Click tracking failed:', error);
      message.retry();
    }
  }
}
```

## Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

## Migration Commands

```json
// package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit migrate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Performance Targets

- **Redirect latency**: p99 < 50ms globally
- **Click processing**: < 100ms queue latency
- **Dashboard queries**: < 200ms for common views
- **Reader profile updates**: Atomic with click tracking

## Security Checklist

- [ ] Multi-tenant isolation via repository pattern
- [ ] No direct SQL queries - use Drizzle only
- [x] Queue message.id for idempotency ✅ (worker updated)
- [ ] IP hashing with daily salt
- [ ] No PII in logs
- [ ] Prepared statements for all hot paths

## Next Steps

1. Create schema files in proper structure
2. Generate initial migration
3. ~~Update worker to pass message.id~~ ✅ Done
4. Implement repository pattern for queries
5. Add monitoring for connection pool usage

## Implementation Context

### Environment Variables Required
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Dependencies to Install
```json
{
  "dependencies": {
    "drizzle-orm": "latest",
    "postgres": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "@types/node": "latest"
  }
}
```

### Railway PostgreSQL Notes
- Connection limit: 100 connections total
- SSL required in production: `sslmode=require`
- Supports prepared statements
- Daily backups available to R2

### Worker Integration Points

**Router Worker** (apps/router)
- Imports from `@repo/db/schema`
- Uses `createEdgeDB` function for Hyperdrive connection
- Types needed: `Database`, `ClickData`
- Schema exports: `links`, `clicks`, `issues`, `newsletters`

**Parser Worker** (apps/parser) - Planned
- Will import from `@repo/db/schema`
- Uses `createEdgeDB` function for Hyperdrive connection
- Creates draft issues with `sentAt: null`
- Bulk inserts extracted links
- Reuses existing schema without modifications