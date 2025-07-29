import { NextResponse } from 'next/server'
import { getCSRFToken } from '@/lib/csrf'

/**
 * GET /api/csrf
 * Returns the CSRF token for the current session
 */
export async function GET() {
  try {
    const token = await getCSRFToken()

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Failed to generate CSRF token:', error)
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
  }
}
