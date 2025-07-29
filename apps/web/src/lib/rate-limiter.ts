import { LRUCache } from 'lru-cache'

type RateLimiterOptions = {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval?: number
}

type RateLimiterResponse = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function rateLimiter(options: RateLimiterOptions) {
  const cache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval,
  })

  return {
    check: async (token: string, limit: number): Promise<RateLimiterResponse> => {
      const now = Date.now()
      const windowStart = now - options.interval

      const timestamps = cache.get(token) || []
      const recentTimestamps = timestamps.filter((ts: number) => ts > windowStart)

      if (recentTimestamps.length >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: recentTimestamps[0] + options.interval,
        }
      }

      recentTimestamps.push(now)
      cache.set(token, recentTimestamps)

      return {
        success: true,
        limit,
        remaining: limit - recentTimestamps.length,
        reset: now + options.interval,
      }
    },
  }
}
