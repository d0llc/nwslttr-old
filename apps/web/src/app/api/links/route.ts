import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { validateCSRFToken } from '@/lib/csrf'
import { db, links, issues, newsletters, eq, desc, and, sql } from '@repo/db'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { warmLinkCache } from '@/lib/kv-cache'

const createLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(100).optional(),
  shortcode: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  issueId: z.string().uuid(), // Required: links must belong to an issue
})

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    const offset = (page - 1) * limit
    const userId = session.user.id

    // Get all links that belong to issues that belong to newsletters owned by the user
    const [userLinks, totalCount] = await Promise.all([
      db
        .select({
          id: links.id,
          url: links.url,
          shortcode: links.shortcode,
          title: links.title,
          createdAt: links.createdAt,
          clickCount: links.clickCount,
          newsletterName: newsletters.name,
          issueTitle: issues.title,
        })
        .from(links)
        .innerJoin(issues, eq(links.issueId, issues.id))
        .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
        .where(eq(newsletters.ownerId, userId))
        .orderBy(desc(links.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql`count(*)` })
        .from(links)
        .innerJoin(issues, eq(links.issueId, issues.id))
        .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
        .where(eq(newsletters.ownerId, userId))
        .then((result) => Number(result[0]?.count) || 0),
    ])

    return NextResponse.json({
      links: userLinks,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to fetch links:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate CSRF token
  if (!(await validateCSRFToken(request as any))) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createLinkSchema.parse(body)
    const userId = session.user.id

    // Generate short code if not provided
    const shortcode = data.shortcode || nanoid(6)

    // Check if short code already exists
    const existing = await db.select().from(links).where(eq(links.shortcode, shortcode)).limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Short code already exists' }, { status: 409 })
    }

    // Validate that the user owns the issue (through newsletter ownership)
    const issue = await db
      .select({
        id: issues.id,
        newsletterId: issues.newsletterId,
      })
      .from(issues)
      .innerJoin(newsletters, eq(issues.newsletterId, newsletters.id))
      .where(and(eq(issues.id, data.issueId), eq(newsletters.ownerId, userId)))
      .limit(1)

    if (issue.length === 0) {
      return NextResponse.json(
        { error: 'Issue not found or you do not have permission to add links to it' },
        { status: 404 }
      )
    }

    // Create the link
    const [newLink] = await db
      .insert(links)
      .values({
        url: data.url,
        title: data.title,
        shortcode: shortcode,
        issueId: data.issueId,
      })
      .returning()

    // Warm the KV cache (non-blocking)
    warmLinkCache({
      id: newLink.id,
      shortcode: newLink.shortcode,
      url: newLink.url,
      issueId: newLink.issueId,
      position: newLink.position,
      alias: newLink.alias,
    }).catch((error) => {
      console.error('Cache warming failed:', error)
    })

    return NextResponse.json(newLink, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    console.error('Failed to create link:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
