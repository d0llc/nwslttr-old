'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to get CSRF token for API requests
 */
export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch CSRF token from API endpoint
    fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => {
        setCSRFToken(data.token)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch CSRF token:', err)
        setLoading(false)
      })
  }, [])

  return { csrfToken, loading }
}

/**
 * Helper to add CSRF token to fetch requests
 */
export function fetchWithCSRF(url: string, options: RequestInit = {}, csrfToken: string | null) {
  if (!csrfToken) {
    throw new Error('CSRF token not available')
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    },
  })
}
