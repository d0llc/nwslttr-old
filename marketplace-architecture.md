# nwslttr.io Marketplace Architecture

## System Overview

```mermaid
graph TB
    subgraph "Users (Single Identity)"
        U[Users Table]
        U --> |"can be"| Author[Newsletter Author]
        U --> |"can be"| Reader[Inbox Reader]
        U --> |"can be both"| Both[Author + Reader]
    end

    subgraph "B2B Flow (Current)"
        Author --> NL[Newsletters]
        NL --> Issues
        Issues --> Links
        Links --> |"tracked via"| Clicks
        Clicks --> |"builds"| RP[Reader Profiles]
    end

    subgraph "B2C Flow (Future)"
        Reader --> Inbox[Inbox Address]
        Inbox --> |"receives"| Emails[Newsletter Emails]
        Emails --> |"processed by"| AI[AI Summaries]
        AI --> |"generates"| DS[Daily Summaries]
        Reader --> |"subscribes to"| Subs[Inbox Subscriptions]
    end

    subgraph "Intelligence Layer"
        RP --> |"enriches"| UI[Unified Intelligence]
        DS --> |"enriches"| UI
        UI --> |"powers"| Insights[Cross-Platform Insights]
    end

    style U fill:#f9f,stroke:#333,stroke-width:4px
    style UI fill:#9ff,stroke:#333,stroke-width:4px
```

## Database Schema

```mermaid
erDiagram
    users {
        uuid id PK
        text email UK
        timestamp email_verified
        text name
        text image
        
        boolean is_author "default: false"
        boolean is_reader "default: false"
        text inbox_address UK "username@nwslttr.inbox"
        
        text stripe_customer_id
        text author_plan "free|pro|enterprise"
        text reader_plan "free|premium"
        
        jsonb author_settings
        jsonb reader_preferences
        timestamp created_at
        timestamp updated_at
    }

    newsletters {
        uuid id PK
        uuid user_id FK
        text name
        text domain
        text platform "convertkit|mailchimp|etc"
        timestamp created_at
    }

    issues {
        uuid id PK
        uuid newsletter_id FK
        text subject
        timestamp sent_at
        integer subscriber_count
        timestamp created_at
    }

    links {
        uuid id PK
        uuid issue_id FK
        text url
        varchar shortcode UK "12 chars"
        varchar alias UK "optional"
        integer position
        text title
        timestamp created_at
    }

    clicks {
        bigserial id PK
        uuid link_id FK
        timestamp clicked_at
        text message_id UK "queue idempotency"
        
        text reader_email
        jsonb merge_params
        
        text ip_country
        text user_agent
        text referer
        text click_type
    }

    reader_profiles {
        uuid id PK
        text reader_email
        uuid newsletter_id FK
        
        timestamp first_seen_at
        timestamp last_clicked_at
        integer click_count
        
        jsonb interests
        integer engagement_score
        text lifecycle "new|engaged|at_risk|churned"
    }

    inbox_subscriptions {
        uuid id PK
        uuid user_id FK
        text newsletter_email
        text forwarding_address
        timestamp subscribed_at
        text status "active|paused|unsubscribed"
    }

    inbox_emails {
        uuid id PK
        uuid user_id FK
        text from_address
        text subject
        timestamp received_at
        boolean processed
        text r2_object_key "raw email in R2"
        jsonb extracted_metadata
    }

    daily_summaries {
        uuid id PK
        uuid user_id FK
        timestamp generated_at
        jsonb content
        integer newsletter_count
        integer insight_count
        text delivery_status
    }

    unified_intelligence {
        uuid id PK
        text email UK
        uuid b2b_profile_id FK
        uuid b2c_user_id FK
        jsonb merged_interests
        integer overall_engagement
        jsonb behavior_patterns
        timestamp last_updated
    }

    users ||--o{ newsletters : creates
    users ||--o{ inbox_subscriptions : has
    users ||--o{ inbox_emails : receives
    users ||--o{ daily_summaries : gets
    
    newsletters ||--o{ issues : contains
    newsletters ||--o{ reader_profiles : tracks
    
    issues ||--o{ links : contains
    links ||--o{ clicks : receives
    
    inbox_subscriptions }o--|| newsletters : "subscribes to"
    
    reader_profiles ||--o| unified_intelligence : "enriches"
    users ||--o| unified_intelligence : "enriches"
```

## Worker Architecture

```mermaid
graph LR
    subgraph "Edge Workers"
        RW[Router Worker<br/>nwslttr.io]
        EW[Email Worker<br/>@nwslttr.inbox]
    end

    subgraph "Queue Processing"
        CQ[Click Queue]
        EQ[Email Queue]
        SQ[Summary Queue]
    end

    subgraph "Scheduled Workers"
        SW[Summary Worker<br/>Daily Cron]
        PW[Profile Worker<br/>Hourly Updates]
    end

    subgraph "Storage"
        KV[KV Cache]
        PG[(PostgreSQL)]
        R2[R2 Storage]
        AE[Analytics Engine]
    end

    RW --> |"<50ms redirect"| KV
    RW --> |"cache miss"| PG
    RW --> |"queue click"| CQ
    RW --> |"real-time"| AE

    EW --> |"store email"| R2
    EW --> |"queue process"| EQ
    
    CQ --> |"batch insert"| PG
    EQ --> |"AI summarize"| PG
    
    SW --> |"generate"| SQ
    SQ --> |"send via"| EW
    
    PW --> |"update profiles"| PG
    PW --> |"merge intelligence"| PG
```

## Data Flow Examples

### B2B: Author Creates Newsletter → Reader Clicks

```mermaid
sequenceDiagram
    participant Author
    participant Dashboard
    participant DB
    participant Router
    participant Reader

    Author->>Dashboard: Create newsletter issue
    Dashboard->>DB: Insert issue + links
    DB->>Dashboard: Generate short codes
    Dashboard->>Author: Provide trackable links
    
    Author->>Reader: Send newsletter
    Reader->>Router: Click link (nwslttr.io/abc123)
    Router->>KV: Check cache
    Router->>Reader: 301 Redirect (<50ms)
    Router->>Queue: Track click async
    Queue->>DB: Update reader profile
```

### B2C: Reader Receives Daily Summary

```mermaid
sequenceDiagram
    participant Newsletter
    participant EmailWorker
    participant AI
    participant DB
    participant Reader

    Newsletter->>EmailWorker: Send to reader@nwslttr.inbox
    EmailWorker->>R2: Store raw email
    EmailWorker->>Queue: Process email
    
    Queue->>AI: Extract insights
    AI->>DB: Store processed content
    
    Note over DB: Daily at 8am
    
    CronJob->>DB: Fetch user's newsletters
    CronJob->>AI: Generate summary
    AI->>EmailWorker: Send summary
    EmailWorker->>Reader: Deliver insights
```

### Unified Intelligence Flow

```mermaid
graph TD
    subgraph "Data Sources"
        B2B[B2B Click Data<br/>Who clicked what]
        B2C[B2C Reading Data<br/>What they subscribe to]
    end

    subgraph "Intelligence Processing"
        Merge[Merge Profiles<br/>Same email = same person]
        Enrich[Enrich Patterns<br/>Reading + Creating behavior]
        Score[Score Engagement<br/>Unified metric]
    end

    subgraph "Value Creation"
        AuthorInsight[Author gets:<br/>"Your React readers also read AI Weekly"]
        ReaderRec[Reader gets:<br/>"You might like this newsletter"]
        Platform[Platform gets:<br/>Complete market intelligence]
    end

    B2B --> Merge
    B2C --> Merge
    Merge --> Enrich
    Enrich --> Score
    Score --> AuthorInsight
    Score --> ReaderRec
    Score --> Platform
```

## Key Design Decisions

1. **Single User Table**: One identity can be author, reader, or both
2. **Separate Tracking**: B2B tracks via links, B2C tracks via email forwarding  
3. **Unified Intelligence**: Merge data from both sides for network effects
4. **Edge Performance**: Redirects stay <50ms, everything else is async
5. **Privacy First**: Separate reader_email from user PII