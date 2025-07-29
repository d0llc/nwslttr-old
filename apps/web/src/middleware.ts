import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimiter } from '@/lib/rate-limiter'

// Rate limiting for auth endpoints
const authRateLimiter = rateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

// Custom middleware that combines auth and rate limiting
export default withAuth(
  async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname

    // Rate limit auth endpoints
    if (pathname.startsWith('/api/auth/')) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
      const { success, limit, remaining, reset } = await authRateLimiter.check(ip, 10) // 10 requests per minute

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        )
      }
    }

    // Add security headers
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    )

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes
        if (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/api/auth')) {
          return true
        }

        // Protected routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
