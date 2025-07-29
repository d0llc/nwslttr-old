// Get these from your Cloudflare dashboard or env vars
const CF_API_TOKEN = process.env.CF_API_TOKEN
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const KV_NAMESPACE_ID =
  process.env.NODE_ENV === 'production'
    ? 'e7604dc03c8041939a7d948f9e982098'
    : '97f198cbb9d24db39a1118068eedef6d'

const KV_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}`

interface CachedLink {
  u: string // url
  i: string // link id (first 8 chars)
  s: string // issue id (first 8 chars)
  p: number // position
}

/**
 * Warm KV cache when creating a new link
 */
export async function warmLinkCache(link: {
  id: string
  shortcode: string
  url: string
  issueId: string
  position: number
  alias?: string | null
}) {
  const cacheData: CachedLink = {
    u: link.url,
    i: link.id.substring(0, 8),
    s: link.issueId.substring(0, 8),
    p: link.position,
  }

  const writes = [
    // Always cache the shortcode
    fetch(`${KV_API_BASE}/values/link:${link.shortcode}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(cacheData),
        metadata: { linkId: link.id },
        expiration_ttl: 604800, // 7 days
      }),
    }),
  ]

  // Also cache the alias if it exists
  if (link.alias) {
    writes.push(
      fetch(`${KV_API_BASE}/values/link:${link.alias}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(cacheData),
          metadata: { linkId: link.id },
          expiration_ttl: 604800, // 7 days
        }),
      })
    )
  }

  try {
    await Promise.all(writes)
  } catch (error) {
    // Log but don't fail - cache warming is not critical
    console.error('Failed to warm cache:', error)
  }
}

/**
 * Invalidate KV cache when updating/deleting a link
 */
export async function invalidateLinkCache(shortcode: string, alias?: string | null) {
  const deletes = [
    fetch(`${KV_API_BASE}/values/link:${shortcode}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
      },
    }),
  ]

  if (alias) {
    deletes.push(
      fetch(`${KV_API_BASE}/values/link:${alias}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
        },
      })
    )
  }

  try {
    await Promise.all(deletes)
  } catch (error) {
    // Log but don't fail - cache invalidation is not critical
    console.error('Failed to invalidate cache:', error)
  }
}

/**
 * Bulk warm cache for multiple links (e.g., when creating an issue)
 */
export async function bulkWarmCache(
  links: Array<{
    id: string
    shortcode: string
    url: string
    issueId: string
    position: number
    alias?: string | null
  }>
) {
  // KV API supports bulk writes via the bulk endpoint
  const bulkData = links.flatMap((link) => {
    const cacheData: CachedLink = {
      u: link.url,
      i: link.id.substring(0, 8),
      s: link.issueId.substring(0, 8),
      p: link.position,
    }

    const entries = [
      {
        key: `link:${link.shortcode}`,
        value: JSON.stringify(cacheData),
        metadata: { linkId: link.id },
        expiration_ttl: 604800,
      },
    ]

    if (link.alias) {
      entries.push({
        key: `link:${link.alias}`,
        value: JSON.stringify(cacheData),
        metadata: { linkId: link.id },
        expiration_ttl: 604800,
      })
    }

    return entries
  })

  try {
    await fetch(`${KV_API_BASE}/bulk`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bulkData),
    })
  } catch (error) {
    console.error('Failed to bulk warm cache:', error)
  }
}
