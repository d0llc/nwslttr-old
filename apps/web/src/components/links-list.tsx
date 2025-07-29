'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type LinkItem = {
  id: number
  shortCode: string
  url: string
  title: string | null
  clickCount?: number
  createdAt: string
}

export function LinksList() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/links?page=${page}&limit=10`)
      const data = await response.json()
      setLinks(data.links)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch links:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
  }, [page])

  const handleDelete = async (shortCode: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return

    try {
      const response = await fetch(`/api/links/${shortCode}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchLinks()
      }
    } catch (error) {
      console.error('Failed to delete link:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <ul className="divide-y divide-gray-200">
        {links.length === 0 ? (
          <li className="p-6">
            <p className="text-gray-500 text-center">No links created yet.</p>
          </li>
        ) : (
          links.map((link) => (
            <li key={link.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {link.title || link.shortCode}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{link.url}</p>
                  <div className="mt-2 flex items-center text-xs text-gray-400 space-x-4">
                    <span>nwslttr.io/{link.shortCode}</span>
                    <span>{link.clickCount || 0} clicks</span>
                    <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  <Link
                    href={`/links/${link.shortCode}`}
                    className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(link.shortCode)}
                    className="text-red-600 hover:text-red-500 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}