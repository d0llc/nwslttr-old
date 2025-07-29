'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = {
  totalLinks: number
  totalClicks: number
  uniqueVisitors: number
}

type RecentLink = {
  id: number
  shortCode: string
  url: string
  title: string | null
  clickCount: number
  createdAt: string
}

export function UserStats() {
  const [stats, setStats] = useState<Stats>({
    totalLinks: 0,
    totalClicks: 0,
    uniqueVisitors: 0,
  })
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats)
        setRecentLinks(data.recentLinks)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Statistics</h2>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-gray-50 px-4 py-5 rounded-lg">
            <dt className="text-sm font-medium text-gray-500">Total Links</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalLinks}</dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 rounded-lg">
            <dt className="text-sm font-medium text-gray-500">Total Clicks</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalClicks}</dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 rounded-lg">
            <dt className="text-sm font-medium text-gray-500">Unique Visitors</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.uniqueVisitors}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Links</h2>
        {recentLinks.length === 0 ? (
          <p className="text-gray-500">No links created yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recentLinks.map((link) => (
              <li key={link.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {link.title || link.shortCode}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{link.url}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {link.clickCount} clicks • Created {new Date(link.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/links/${link.shortCode}`}
                    className="ml-4 text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}