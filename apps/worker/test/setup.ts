import { beforeAll } from 'vitest'
import { env } from 'cloudflare:test'

beforeAll(() => {
  if (!env.RATE_LIMITER) {
    // @ts-ignore
    env.RATE_LIMITER = {
      limit: async () => ({ success: true }),
    }
  }
})
