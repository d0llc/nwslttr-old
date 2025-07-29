import { createWorkerDB } from '@repo/db/worker'
import { eq, or } from 'drizzle-orm'
import { links, clicks } from '@repo/db/schema'

interface Env {
  CACHE: KVNamespace
  DATABASE: Hyperdrive
  ANALYTICS: AnalyticsEngineDataset
  QUEUE: Queue<ClickData>
  RATE_LIMITER: RateLimit
}

interface CachedLink {
  u: string
  i: string
  s: string
  p: number
}

interface ClickData {
  linkId: string
  clickedAt: string
  ipCountry: string | null
  userAgent: string | null
  referer: string | null
  queryParams: Record<string, string> | null
  mergeParams: Record<string, string> | null
}

interface AnalyticsDataPoint {
  indexes?: string[]
  blobs?: string[]
  doubles?: number[]
}

const responses = {
  notFound: () =>
    new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    }),

  redirect: (url: string) =>
    new Response(null, {
      status: 301,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Robots-Tag': 'noindex',
      },
    }),

  methodNotAllowed: () =>
    new Response('Method not allowed', {
      status: 405,
      headers: { 'Cache-Control': 'no-store' },
    }),

  tooManyRequests: () =>
    new Response('Too many requests', {
      status: 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    }),

  internalError: () =>
    new Response('Internal error', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    }),

  ok: (text: string, cache?: string) =>
    new Response(text, {
      status: 200,
      headers: { 'Cache-Control': cache || 'no-store' },
    }),
}

async function writeAnalytics(env: Env, data: AnalyticsDataPoint): Promise<void> {
  try {
    await env.ANALYTICS.writeDataPoint(data)
  } catch {}
}

const MERGE_PARAMS = new Set([
  'subscriber_id',
  'sub_id',
  'email',
  'contact_id',
  'member_id',
  'uuid',
  'user_id',
  'recipient_id',
  'ref',
  'uid',
  'mi_u',
  'ml_subscriber',
  'token',
])

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const start = Date.now()

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return responses.methodNotAllowed()
    }

    const url = new URL(request.url)
    const path = url.pathname.slice(1)

    if (!path) {
      return responses.ok('router', 'public, max-age=3600')
    }

    if (path === '_health') {
      return responses.ok('OK')
    }

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(path)) {
      return responses.notFound()
    }

    const clientIP = request.headers.get('CF-Connecting-IP') || 'anonymous'
    const cf = request.cf

    // Skip rate limiting for likely bots (they get blocked in trackClick anyway)
    const botScore = (cf as any)?.botManagement?.score
    if (botScore && botScore < 30) {
      // Bot traffic - let it through but won't be tracked
      // This prevents bots from consuming rate limit quota
    } else {
      // Only rate limit human traffic
      const { success } = await env.RATE_LIMITER.limit({ key: clientIP })
      if (!success) {
        // For viral links, still serve the redirect but skip tracking
        // This ensures real users can always access the content
        const cached = (await env.CACHE.get(`link:${path}`, { type: 'json' })) as CachedLink | null

        if (cached) {
          return responses.redirect(cached.u)
        }

        // Only return 429 if we can't serve from cache
        return responses.tooManyRequests()
      }
    }

    const cacheKey = `link:${path}`
    const cached = (await env.CACHE.get(cacheKey, {
      type: 'json',
      cacheTtl: 3600, // 1 hour edge cache for hot links
    })) as CachedLink | null

    if (cached) {
      const isPreview =
        url.searchParams.get('preview') === 'true' || url.searchParams.get('preview') === '1'

      if (!isPreview) {
        ctx.waitUntil(
          trackClick(
            request,
            env,
            ctx,
            {
              id: cached.i,
              shortcode: path,
              issueId: cached.s,
              position: cached.p,
              url: cached.u,
            },
            url
          )
        )
      }

      ctx.waitUntil(
        writeAnalytics(env, {
          indexes: ['redirect_metrics'],
          blobs: [
            'redirect_served',
            path.substring(0, 16),
            'cache_hit',
            (request.cf as any)?.colo || 'unknown',
          ],
          doubles: [Date.now(), Date.now() - start],
        })
      )

      return responses.redirect(cached.u)
    }

    const db = createWorkerDB(env.DATABASE)

    try {
      const [link] = await db
        .select({
          id: links.id,
          url: links.url,
          shortcode: links.shortcode,
          issueId: links.issueId,
          position: links.position,
        })
        .from(links)
        .where(or(eq(links.shortcode, path), eq(links.alias, path)))
        .limit(1)

      if (!link) {
        return responses.notFound()
      }

      const cacheData: CachedLink = {
        u: link.url,
        i: link.id.substring(0, 8),
        s: link.issueId.substring(0, 8),
        p: link.position,
      }

      const cacheWrites = [
        env.CACHE.put(`link:${link.shortcode}`, JSON.stringify(cacheData), {
          expirationTtl: 604800, // 7 days
        }),
      ]

      if (path !== link.shortcode) {
        cacheWrites.push(
          env.CACHE.put(cacheKey, JSON.stringify(cacheData), {
            expirationTtl: 604800, // 7 days
          })
        )
      }

      const isPreview =
        url.searchParams.get('preview') === 'true' || url.searchParams.get('preview') === '1'

      const promises = [...cacheWrites]
      if (!isPreview) {
        promises.push(trackClick(request, env, ctx, link, url))
      }
      ctx.waitUntil(Promise.all(promises))

      ctx.waitUntil(
        writeAnalytics(env, {
          indexes: ['redirect_metrics'],
          blobs: [
            'redirect_served',
            path.substring(0, 16),
            'cache_miss',
            (request.cf as any)?.colo || 'unknown',
          ],
          doubles: [Date.now(), Date.now() - start],
        })
      )

      return responses.redirect(link.url)
    } catch (error) {
      ctx.waitUntil(
        writeAnalytics(env, {
          indexes: ['error_metrics'],
          blobs: [
            'database_error',
            path.substring(0, 16),
            error instanceof Error ? error.name : 'unknown_error',
          ],
          doubles: [Date.now(), 1],
        })
      )
      return responses.internalError()
    }
  },

  async queue(batch: MessageBatch<ClickData>, env: Env): Promise<void> {
    const db = createWorkerDB(env.DATABASE)

    if (batch.messages.length === 0) {
      try {
        await db.execute('SELECT 1')
      } catch (error) {
        await writeAnalytics(env, {
          indexes: ['error_metrics'],
          blobs: [
            'db_warming_failed',
            'queue_consumer',
            error instanceof Error ? error.name : 'unknown_error',
          ],
          doubles: [Date.now(), 1],
        })
      }
      return
    }

    const chunkSize = 10
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < batch.messages.length; i += chunkSize) {
      const chunk = batch.messages.slice(i, Math.min(i + chunkSize, batch.messages.length))

      try {
        const clickRecords = chunk.map((msg) => ({
          messageId: msg.id,
          linkId: msg.body.linkId,
          clickedAt: new Date(msg.body.clickedAt),
          ipCountry: msg.body.ipCountry,
          userAgent: msg.body.userAgent,
          referer: msg.body.referer,
          queryParams: msg.body.queryParams,
          mergeParams: msg.body.mergeParams,
        }))

        await db.insert(clicks).values(clickRecords)

        chunk.forEach((msg) => msg.ack())
        successCount += chunk.length
      } catch (error) {
        await writeAnalytics(env, {
          indexes: ['error_metrics'],
          blobs: [
            'queue_failure',
            'clicks_insert',
            error instanceof Error ? error.name : 'unknown_error',
          ],
          doubles: [Date.now(), chunk.length],
        })

        chunk.forEach((msg) => msg.retry())
        failureCount += chunk.length
      }
    }

    if (failureCount > 0 || successCount > 0) {
      await writeAnalytics(env, {
        indexes: ['queue_metrics'],
        blobs: ['batch_processed', batch.queue, failureCount > 0 ? 'partial_failure' : 'success'],
        doubles: [Date.now(), batch.messages.length, successCount, failureCount],
      })
    }
  },
} satisfies ExportedHandler<Env, ClickData>

async function trackClick(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  link: { id: string; shortcode: string; issueId: string; position: number; url: string },
  url: URL
): Promise<void> {
  let subscriberId: string | null = null

  try {
    const cf = request.cf

    // Bot score < 30 indicates likely bot traffic (per Cloudflare docs)
    const botScore = (cf as any)?.botManagement?.score
    if (!botScore || botScore < 30) {
      return
    }

    const mergeParams: Record<string, string> = {}
    const queryParams: Record<string, string> = {}

    for (const [key, value] of url.searchParams) {
      if (MERGE_PARAMS.has(key.toLowerCase())) {
        mergeParams[key] = value
      } else {
        queryParams[key] = value
      }
    }

    subscriberId =
      mergeParams.email ||
      mergeParams.subscriber_id ||
      mergeParams.sub_id ||
      mergeParams.uuid ||
      mergeParams.contact_id ||
      mergeParams.member_id ||
      null

    const clickData: ClickData = {
      linkId: link.id,
      clickedAt: new Date().toISOString(),
      ipCountry: (cf as any)?.country || null,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : null,
      mergeParams: Object.keys(mergeParams).length > 0 ? mergeParams : null,
    }

    const timestamp = Date.now()
    const hourlyBucket = Math.floor(timestamp / 3600000).toString()
    const country = (cf as any)?.country || 'XX'

    const analyticsWrites = []

    analyticsWrites.push(
      env.ANALYTICS.writeDataPoint({
        indexes: [link.issueId],
        blobs: [
          subscriberId || 'anonymous',
          link.shortcode,
          country,
          link.position.toString(),
          hourlyBucket,
        ],
        doubles: [timestamp, link.position],
      })
    )

    if (subscriberId) {
      analyticsWrites.push(
        env.ANALYTICS.writeDataPoint({
          indexes: [subscriberId],
          blobs: [link.issueId, link.shortcode, country, link.position.toString(), hourlyBucket],
          doubles: [timestamp, link.position],
        })
      )
    }

    await Promise.all([...analyticsWrites, env.QUEUE.send(clickData)])
  } catch (error) {
    await writeAnalytics(env, {
      indexes: ['error_metrics'],
      blobs: [
        'analytics_failure',
        link.issueId.substring(0, 8),
        error instanceof Error ? error.name : 'unknown_error',
      ],
      doubles: [Date.now(), 1],
    })
  }
}
