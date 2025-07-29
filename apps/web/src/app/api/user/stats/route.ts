import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, links, clicks, issues, newsletters, eq, sql, desc } from '@repo/db'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = session.user.id

    // Get user statistics
    const [stats] = await db
      .select({
        totalLinks: sql`count(distinct ${links.id})`.as('totalLinks'),
        totalClicks: sql`count(${clicks.id})`.as('totalClicks'),
        uniqueVisitors: sql`count(distinct ${clicks.ipHash})`.as('uniqueVisitors'),
      })
      .from(links)
      .leftJoin(clicks, eq(links.id, clicks.linkId))
      .innerJoin(issues, eq(links.issueId, issues.id))
      .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
      .where(eq(newsletters.ownerId, userId))

    // Get recent activity
    const recentLinks = await db
      .select({
        id: links.id,
        shortcode: links.shortcode,
        url: links.url,
        title: links.title,
        clickCount: sql`count(${clicks.id})`.as('clickCount'),
        createdAt: links.createdAt,
        issueTitle: issues.title,
        newsletterName: newsletters.name,
      })
      .from(links)
      .leftJoin(clicks, eq(links.id, clicks.linkId))
      .innerJoin(issues, eq(links.issueId, issues.id))
      .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
      .where(eq(newsletters.ownerId, userId))
      .groupBy(links.id, issues.id, newsletters.id)
      .orderBy(desc(links.createdAt))
      .limit(5)

    return NextResponse.json({
      stats: {
        totalLinks: stats?.totalLinks || 0,
        totalClicks: stats?.totalClicks || 0,
        uniqueVisitors: stats?.uniqueVisitors || 0,
      },
      recentLinks: recentLinks.map((link) => ({
        ...link,
        clickCount: link.clickCount || 0,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch user stats:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
