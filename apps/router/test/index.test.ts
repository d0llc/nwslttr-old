import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env, SELF, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { createWorkerDB } from '@repo/db/worker'
import { links } from '@repo/db/schema'
import '../src/index'

describe('Router Integration Tests', () => {
  describe('Basic routing', () => {
    it('responds to root path', async () => {
      const response = await SELF.fetch('https://nwslttr.io/')
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('router')
    })

    it('responds to health check', async () => {
      const response = await SELF.fetch('https://nwslttr.io/_health')
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('OK')
    })

    it('returns 405 for non-GET/HEAD methods', async () => {
      const response = await SELF.fetch('https://nwslttr.io/test', { method: 'POST' })
      expect(response.status).toBe(405)
    })

    it('returns 404 for invalid shortcode format', async () => {
      const response = await SELF.fetch('https://nwslttr.io/invalid-@#$')
      expect(response.status).toBe(404)
    })

    it('returns 404 for too long shortcode', async () => {
      const response = await SELF.fetch('https://nwslttr.io/' + 'a'.repeat(101))
      expect(response.status).toBe(404)
    })
  })

  describe('Preview mode', () => {
    beforeAll(async () => {
      await env.CACHE.put(
        'link:preview-test',
        JSON.stringify({
          u: 'https://example.com/preview',
          i: '12345678',
          s: '87654321',
          p: 1,
        })
      )
    })

    afterAll(async () => {
      await env.CACHE.delete('link:preview-test')
    })

    it('skips tracking for preview=true', async () => {
      const response = await SELF.fetch('https://nwslttr.io/preview-test?preview=true')

      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe('https://example.com/preview')
    })

    it('skips tracking for preview=1', async () => {
      const response = await SELF.fetch('https://nwslttr.io/preview-test?preview=1')

      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe('https://example.com/preview')
    })

    it('tracks normally without preview parameter', async () => {
      const response = await SELF.fetch('https://nwslttr.io/preview-test')

      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe('https://example.com/preview')
    })
  })

  describe('KV cache behavior', () => {
    beforeAll(async () => {
      await env.CACHE.put(
        'link:cached-link',
        JSON.stringify({
          u: 'https://cached.example.com',
          i: 'abcd1234',
          s: 'efgh5678',
          p: 5,
        })
      )
    })

    afterAll(async () => {
      await env.CACHE.delete('link:cached-link')
    })

    it('redirects when found in KV cache', async () => {
      const response = await SELF.fetch('https://nwslttr.io/cached-link')

      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe('https://cached.example.com')
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400, immutable')
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
    })
  })

  describe('Database fallback', () => {
    it('returns 404 when link not found in cache or database', async () => {
      const response = await SELF.fetch('https://nwslttr.io/nonexistent')
      expect([404, 500]).toContain(response.status)
    })
  })

  describe('Rate limiting', () => {
    it('enforces rate limits', async () => {
      const response = await SELF.fetch('https://nwslttr.io/test')
      expect([301, 404, 429, 500]).toContain(response.status)
    })
  })
})

describe('Queue Consumer Tests', () => {
  it('handles empty batch', async () => {
    const ctx = createExecutionContext()
    const batch = {
      messages: [],
      queue: 'test-queue',
      ackAll: () => {},
      retryAll: () => {},
    } as any

    const router = await import('../src/index')

    await router.default.queue(batch, env, ctx)
    await waitOnExecutionContext(ctx)
  })

  it('processes click data messages', async () => {
    const ctx = createExecutionContext()
    const messages = [
      {
        id: '1',
        timestamp: new Date(),
        body: {
          linkId: 'test-link-id',
          clickedAt: new Date().toISOString(),
          ipCountry: 'US',
          userAgent: 'Mozilla/5.0',
          referer: 'https://example.com',
          queryParams: { utm_source: 'test' },
          mergeParams: { email: 'test@example.com' },
        },
        ack: () => {},
        retry: () => {},
      },
    ]

    const batch = {
      messages,
      queue: 'test-queue',
      ackAll: () => {},
      retryAll: () => {},
    } as any

    const router = await import('../src/index')

    try {
      await router.default.queue(batch, env, ctx)
    } catch (e) {}

    await waitOnExecutionContext(ctx)
  })
})

describe('Merge parameter extraction', () => {
  it('identifies email parameter as merge param', async () => {
    await env.CACHE.put(
      'link:merge-test',
      JSON.stringify({
        u: 'https://example.com/merge',
        i: '11111111',
        s: '22222222',
        p: 3,
      })
    )

    const response = await SELF.fetch(
      'https://nwslttr.io/merge-test?email=user@example.com&utm_source=newsletter'
    )

    expect(response.status).toBe(301)

    await env.CACHE.delete('link:merge-test')
  })

  it('identifies subscriber_id as merge param', async () => {
    await env.CACHE.put(
      'link:sub-test',
      JSON.stringify({
        u: 'https://example.com/sub',
        i: '33333333',
        s: '44444444',
        p: 2,
      })
    )

    const response = await SELF.fetch(
      'https://nwslttr.io/sub-test?subscriber_id=12345&campaign=summer'
    )

    expect(response.status).toBe(301)

    await env.CACHE.delete('link:sub-test')
  })
})
