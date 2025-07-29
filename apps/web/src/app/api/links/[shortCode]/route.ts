import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, links, clicks, issues, newsletters, eq, and, sql } from '@repo/db'
import { z } from 'zod'
import { invalidateLinkCache, warmLinkCache } from '@/lib/kv-cache'

const updateLinkSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1).max(100).optional(),
  shortcode: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
})

type RouteParams = {
  params: { shortCode: string }
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = session.user.id

    const [link] = await db
      .select({
        id: links.id,
        url: links.url,
        title: links.title,
        shortcode: links.shortcode,
        createdAt: links.createdAt,
        updatedAt: links.updatedAt,
        clickCount: sql`count(${clicks.id})`.as('clickCount'),
        issueId: links.issueId,
        issueTitle: issues.title,
        newsletterName: newsletters.name,
      })
      .from(links)
      .leftJoin(clicks, eq(links.id, clicks.linkId))
      .innerJoin(issues, eq(links.issueId, issues.id))
      .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
      .where(and(eq(links.shortcode, params.shortCode), eq(newsletters.ownerId, userId)))
      .groupBy(links.id, issues.id, newsletters.id)
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...link,
      clickCount: link.clickCount || 0,
    })
  } catch (error) {
    console.error('Failed to fetch link:', error)
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = updateLinkSchema.parse(body)
    const userId = session.user.id

    // Check if link exists and belongs to user through joins
    const [existing] = await db
      .select({
        id: links.id,
        alias: links.alias,
        issueId: links.issueId,
        position: links.position,
      })
      .from(links)
      .innerJoin(issues, eq(links.issueId, issues.id))
      .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
      .where(and(eq(links.shortcode, params.shortCode), eq(newsletters.ownerId, userId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // If changing short code, check if new one is available
    if (data.shortcode && data.shortcode !== params.shortCode) {
      const [duplicate] = await db
        .select()
        .from(links)
        .where(eq(links.shortcode, data.shortcode))
        .limit(1)

      if (duplicate) {
        return NextResponse.json({ error: 'Short code already exists' }, { status: 409 })
      }
    }

    // Update the link using the ID from our ownership check
    const [updatedLink] = await db
      .update(links)
      .set({
        url: data.url,
        title: data.title,
        shortcode: data.shortcode,
        updatedAt: new Date(),
      })
      .where(eq(links.id, existing.id))
      .returning()

    // Invalidate old cache entries
    await invalidateLinkCache(params.shortCode, existing.alias)

    // If URL or shortcode changed, warm new cache
    if (data.url || data.shortcode) {
      await warmLinkCache({
        id: updatedLink.id,
        shortcode: updatedLink.shortcode,
        url: updatedLink.url,
        issueId: updatedLink.issueId,
        position: updatedLink.position,
        alias: updatedLink.alias,
      })
    }

    return NextResponse.json(updatedLink)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    console.error('Failed to update link:', error)
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = session.user.id

    // First, verify ownership through joins
    const [linkToDelete] = await db
      .select({ id: links.id, alias: links.alias })
      .from(links)
      .innerJoin(issues, eq(links.issueId, issues.id))
      .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
      .where(and(eq(links.shortcode, params.shortCode), eq(newsletters.ownerId, userId)))
      .limit(1)

    if (!linkToDelete) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Delete the link using its ID (cascades to clicks)
    await db.delete(links).where(eq(links.id, linkToDelete.id))

    // Invalidate cache entries
    await invalidateLinkCache(params.shortCode, linkToDelete.alias)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete link:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
