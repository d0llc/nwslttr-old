# Email Parser Worker

Email parsing worker that receives newsletters via Cloudflare Email Routing and extracts structured data for the nwslttr platform.

## Overview

The parser worker receives emails at `*.inbox@nwslttr.io`, extracts all relevant data (links, metadata, content structure), and creates draft issues in the database for user review.

## Architecture

```
Email sent to {id}.inbox@nwslttr.io
    ↓
Cloudflare Email Routing
    ↓
Parser Worker (this)
    ↓
Extract: links, title, content, metadata
    ↓
Create draft issue with extracted links
    ↓
User reviews in dashboard
```

## Core Functionality

### Email Reception
- Receives emails at pattern: `{inbox-id}.inbox@nwslttr.io`
- Inbox IDs are temporary (24-hour TTL)
- Maps inbox ID → user/newsletter via KV storage

### Data Extraction

**Links**
- Extract all HTTP/HTTPS links from HTML/text
- Preserve link text and position
- Generate shortcodes for each link
- Maintain link hierarchy/structure

**Metadata**
- Email subject → Issue title
- From address → Sender verification
- Date received → Timestamp
- Reply-to → Newsletter metadata

**Content Structure**
- Identify sections (header, body, footer)
- Extract preview text/snippet
- Detect newsletter platform (ConvertKit, Mailchimp, etc.)
- Parse unsubscribe links separately

**Future Extraction Possibilities**
- Image URLs for thumbnail generation
- Social media links for categorization
- Call-to-action buttons
- Sponsor/ad sections
- Content categories/tags

## Technical Stack

### Dependencies
```json
{
  "dependencies": {
    "postal-mime": "^2.0.0",
    "@repo/db": "workspace:*"
  }
}
```

### Email Parsing
- **Library**: `postal-mime` - Built for serverless, handles RFC822
- **HTML Processing**: Native HTMLRewriter for link extraction
- **No heavy DOM libraries** (cheerio/jsdom) due to Worker constraints

### Bindings Required
```toml
# wrangler.toml
name = "nwslttr-parser"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV for inbox ID mappings
[[kv_namespaces]]
binding = "INBOX_MAPPING"
id = "inbox-mapping-kv-id"

# Database access
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "hyperdrive-id"

# Optional: Queue for async processing
[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "email-processing"
```

## Database Integration

Uses existing schema without modifications:

```typescript
// Creates draft issue
issues: {
  subject: "[Email Test] {original subject}",
  sentAt: null, // Marks as draft
  newsletterId: mappedNewsletterId
}

// Creates links for the issue
links: {
  issueId: createdIssue.id,
  url: extractedUrl,
  shortcode: generatedShortcode,
  title: linkText, // Stores link text
  position: linkIndex
}
```

## Implementation Flow

```typescript
1. Validate inbox address format
2. Look up inbox mapping in KV
3. Parse email with postal-mime
4. Extract all data:
   - Links via HTMLRewriter
   - Metadata from headers
   - Content structure
5. Create draft issue in DB
6. Bulk insert extracted links
7. Return success/reject
```

## Security & Validation

- Inbox IDs expire after 24 hours
- Only process emails with valid inbox mapping
- Sanitize all extracted content
- Limit email size (10MB max)
- Rate limit per inbox ID
- Validate link URLs before storing

## Performance Considerations

- Async email processing (don't block email receipt)
- Bulk insert links (not one-by-one)
- Use prepared statements via Hyperdrive
- Stream large emails if needed
- KV for fast inbox lookups

## Error Handling

```typescript
try {
  // Process email
} catch (error) {
  if (error.code === '23505') {
    // Duplicate email - safe to ignore
    message.setReject("Already processed");
  } else {
    // Log error, reject email
    console.error('Parser error:', error);
    message.setReject("Processing failed");
  }
}
```

## Dashboard Integration

Draft issues appear in dashboard with:
- `[Email Test]` prefix for easy filtering
- Extracted links ready for review
- Original metadata preserved
- One-click conversion to real issue
- Bulk shortcode customization

## Local Development

```bash
# Install dependencies
pnpm install

# Run locally with email simulator
pnpm wrangler dev --local

# Test with curl
curl -X POST http://localhost:8787/email \
  -H "Content-Type: message/rfc822" \
  --data-binary @test-email.eml
```

## Monitoring

Track in Analytics Engine:
- Emails received per newsletter
- Links extracted per email
- Parse failures and errors
- Processing time metrics

## Future Enhancements

1. **Smart Categorization**
   - Auto-detect link types (content, social, ads)
   - Group related links
   - Identify newsletter sections

2. **Content Intelligence**
   - Extract key topics/themes
   - Generate issue summaries
   - Suggest optimal link positions

3. **Platform Detection**
   - Auto-configure based on ESP
   - Extract platform-specific metadata
   - Handle platform quirks

4. **Batch Processing**
   - Handle multiple emails
   - Bulk import via forward rules
   - Newsletter archive import

## Notes

- This worker is tightly coupled to nwslttr's schema
- Designed for single-purpose email → link extraction
- Not a generic email processor (intentionally)
- Optimized for newsletter content structure