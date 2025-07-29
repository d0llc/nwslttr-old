import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const CSRF_TOKEN_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Get or create a CSRF token for the current session
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(CSRF_TOKEN_NAME)

  if (existingToken?.value) {
    return existingToken.value
  }

  // Generate new token
  const token = generateCSRFToken()

  // Set cookie with secure options
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return token
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both tokens must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Constant-time string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Higher-order function to wrap API routes with CSRF protection
 */
export function withCSRFProtection<T extends Function>(handler: T): T {
  return (async (request: NextRequest, ...args: any[]) => {
    if (!(await validateCSRFToken(request))) {
      return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return handler(request, ...args)
  }) as unknown as T
}
