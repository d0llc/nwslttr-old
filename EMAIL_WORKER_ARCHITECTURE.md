# Email Worker Architecture Research

## Overview

This document outlines the research findings for structuring email workers in a multi-product architecture, specifically for nwslttr.io's use case of handling both B2B (newsletter authors) and B2C (newsletter readers) email workflows.

## Key Findings

### 1. Industry Patterns

#### Subdomain vs Path-Based Email Routing

**Subdomain Approach (Recommended)**
- Each product/service gets its own subdomain
- Examples:
  - `drafts@nwslttr.io` - Author draft submissions
  - `notify@app.nwslttr.io` - System notifications
  - `support@help.nwslttr.io` - Support emails
- Benefits:
  - Reputation isolation per subdomain
  - Different email providers can be used per subdomain
  - Clear separation of email types
  - Better deliverability management

**Path-Based Approach**
- Single domain with different local parts (before @)
- Less flexible for reputation management
- All emails share same domain reputation

### 2. Multi-Tenant Architecture Patterns

#### B2B Pattern (Newsletter Authors)
- Shared user pool with organization-based isolation
- Each newsletter/publication is a "tenant"
- Authors can belong to multiple newsletters
- Requires tenant_id isolation in database

#### B2C Pattern (Newsletter Readers)
- Direct user routing without organizations
- Reader profiles linked to email addresses
- Cross-newsletter intelligence building

### 3. Worker Architecture Options

## Option A: Single Email Worker (Monolithic)

```
┌─────────────────────────────────────────────────────────────────┐
│                     SINGLE EMAIL WORKER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Incoming Email Routes:                                         │
│  - uniquestring@nwslttr.io → Draft processing                  │
│  - reply-*@nwslttr.io → Reply handling                        │
│  - support@nwslttr.io → Support tickets                       │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  Route Parser   │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │ Email Type      │                                           │
│  │ Classifier      │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────────────────────────────┐                  │
│  │         Processing Logic                 │                  │
│  ├─────────────────────────────────────────┤                  │
│  │ • Draft Analysis & Link Generation      │                  │
│  │ • Reply Processing & Routing            │                  │
│  │ • Support Ticket Creation               │                  │
│  │ • Bounce/Complaint Handling             │                  │
│  └────────┬────────────────────────────────┘                  │
│           │                                                     │
│  ┌────────▼────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │   PostgreSQL    │  │  KV Storage  │  │  Analytics  │      │
│  │   (via Hyper-   │  │  (Caching)   │  │   Engine    │      │
│  │    drive)       │  │              │  │             │      │
│  └─────────────────┘  └──────────────┘  └─────────────┘      │
│                                                                 │
│  Outbound Actions:                                             │
│  - Send processed draft back to author                         │
│  - Forward support tickets                                     │
│  - Update reader profiles                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Simple deployment and maintenance
- Shared code and utilities
- Single codebase to manage

**Cons:**
- All email types share same reputation
- Complex routing logic in one place
- Harder to scale specific email types
- Single point of failure

## Option B: Multiple Specialized Workers (Microservices)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL ROUTING GATEWAY                        │
│                 (Main Email Worker Entry)                       │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                        │
│  - *@nwslttr.io → Route based on pattern                      │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  Email Parser   │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │ Route Decision  │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ├─────────────────────────────────┐
            │                                 │
┌───────────▼──────────┐          ┌──────────▼──────────┐
│   DRAFT WORKER       │          │   REPLY WORKER      │
├──────────────────────┤          ├─────────────────────┤
│ uniquestring@        │          │ reply-*@            │
│                      │          │                     │
│ • Content Analysis   │          │ • Parse reply ID    │
│ • Link Generation    │          │ • Find original     │
│ • Smart Analytics    │          │ • Route to author   │
│                      │          │                     │
│ ┌──────────────┐     │          │ ┌──────────────┐   │
│ │ PostgreSQL   │     │          │ │ PostgreSQL   │   │
│ │ (Issues,     │     │          │ │ (Readers,    │   │
│ │  Links)      │     │          │ │  Authors)    │   │
│ └──────────────┘     │          │ └──────────────┘   │
│                      │          │                     │
│ Service Bindings:    │          │ Service Bindings:  │
│ → Analytics Worker   │          │ → Notification     │
│ → Email Send Worker  │          │   Worker           │
└──────────────────────┘          └─────────────────────┘
            │                                 │
            └─────────────────────────────────┤
                                             │
┌────────────────────────┐        ┌──────────▼──────────┐
│   SUPPORT WORKER       │        │  BOUNCE WORKER      │
├────────────────────────┤        ├─────────────────────┤
│ support@               │        │ bounce@, complaint@ │
│                        │        │                     │
│ • Create tickets       │        │ • Parse bounce type │
│ • Auto-responses       │        │ • Update reputation │
│ • Routing logic        │        │ • Suppress list     │
│                        │        │                     │
│ ┌──────────────┐       │        │ ┌──────────────┐   │
│ │ PostgreSQL   │       │        │ │ PostgreSQL   │   │
│ │ (Tickets)    │       │        │ │ (Reputation) │   │
│ └──────────────┘       │        │ └──────────────┘   │
│                        │        │                     │
│ Service Bindings:      │        │ Service Bindings:  │
│ → Notification Worker  │        │ → Analytics Worker │
└────────────────────────┘        └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SHARED SERVICE WORKERS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │ Analytics Worker   │  │ Email Send Worker  │               │
│  ├────────────────────┤  ├────────────────────┤               │
│  │ • Click tracking   │  │ • Template render  │               │
│  │ • Reader profiles  │  │ • SMTP/API calls   │               │
│  │ • Engagement calc  │  │ • Retry logic      │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │ Notification       │  │ AI Analysis        │               │
│  │ Worker             │  │ Worker             │               │
│  ├────────────────────┤  ├────────────────────┤               │
│  │ • Webhook calls    │  │ • Content analysis │               │
│  │ • App notifications│  │ • Topic extraction │               │
│  │ • Email alerts     │  │ • Sentiment        │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Reputation isolation per email type
- Independent scaling
- Clear separation of concerns
- Fault isolation
- Easier to test individual components

**Cons:**
- More complex deployment
- Service binding configuration
- Potential for more points of failure

### 4. Cloudflare-Specific Implementation Details

#### Service Bindings
- Zero-latency communication between workers
- No network overhead
- Shared compute thread
- RPC or HTTP-style communication

#### Configuration Example
```toml
# wrangler.toml for Gateway Worker
name = "email-gateway"
services = [
  { binding = "DRAFT_WORKER", service = "email-draft-processor" },
  { binding = "REPLY_WORKER", service = "email-reply-handler" },
  { binding = "SUPPORT_WORKER", service = "email-support" },
  { binding = "BOUNCE_WORKER", service = "email-bounce-handler" }
]

[[email_routing_rules]]
name = "catch-all"
pattern = "*@nwslttr.io"
```

### 5. Database Interaction Patterns

#### Via Hyperdrive (Recommended)
- Connection pooling at edge
- Reduced latency
- Better connection management

#### Multi-Tenant Queries
```sql
-- Always include tenant_id in queries
SELECT * FROM links 
WHERE tenant_id = ? AND issue_id = ?;

-- Row-level security policies
CREATE POLICY tenant_isolation ON links
FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Recommendation

For nwslttr.io, I recommend **Option B: Multiple Specialized Workers** with the following structure:

1. **Email Gateway Worker** - Routes incoming emails
2. **Draft Processing Worker** - Handles author draft submissions
3. **Reply Handler Worker** - Manages reader replies
4. **Support Worker** - Processes support emails
5. **Bounce/Complaint Worker** - Handles email delivery issues
6. **Shared Service Workers** - Analytics, notifications, email sending

This architecture provides:
- Clear separation between B2B (authors) and B2C (readers) flows
- Reputation isolation for different email types
- Scalability for high-volume draft processing
- Fault tolerance
- Easy addition of new email types

## Implementation Priority

1. Start with Draft Processing Worker (core functionality)
2. Add Email Gateway for routing
3. Implement Reply Handler for reader engagement
4. Add Bounce/Complaint handling for reputation
5. Build support and other auxiliary workers

## Key Considerations

1. **Email Reputation**: Use different subdomains for different email types
2. **Multi-Tenancy**: Implement tenant_id isolation from the start
3. **Performance**: Draft processing must never block email receipt
4. **Analytics**: Use dual pattern (Analytics Engine + PostgreSQL)
5. **Privacy**: Hash IPs with daily salt, no cookies