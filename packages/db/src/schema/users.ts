import { pgTable, text, timestamp, jsonb, uuid, index, integer, boolean, unique } from 'drizzle-orm/pg-core'

/**
 * User and marketplace tables with Clerk integration
 * 
 * Clerk handles authentication, we handle business data
 */

// Users table - synced from Clerk via webhooks
export const users = pgTable('users', {
  // Clerk user ID (format: 'user_2NNEqL2nrIRdJ194ndJqAHwEfxC')
  id: text('id').primaryKey(),
  
  // Cached from Clerk for fast queries
  email: text('email').notNull().unique(),
  name: text('name'),
  imageUrl: text('image_url'),
  
  // Business-specific fields
  inboxAddress: text('inbox_address').unique(), // For B2C: sarah@nwslttr.inbox
  onboardingCompleted: boolean('onboarding_completed').default(false),
  lifecycleStage: text('lifecycle_stage').default('new'), // 'new', 'active', 'churned'
  
  // Analytics & Attribution
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  
  // Attribution/tracking metadata
  metadata: jsonb('metadata').$type<{
    utmSource?: string
    utmCampaign?: string
    referrer?: string
    initialProductInterest?: string
    experiments?: Record<string, string>
  }>().default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  lastActiveIdx: index('users_last_active_idx').on(table.lastActiveAt),
}))

// Product catalog - what users can subscribe to
export const products = pgTable('products', {
  id: text('id').primaryKey(), // 'analytics', 'inbox', 'api'
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  
  features: jsonb('features').$type<{
    // Analytics product
    newsletters?: number
    trackingLinks?: number
    teamMembers?: number
    apiAccess?: boolean
    customDomain?: boolean
    webhooks?: boolean
    
    // Inbox product
    inboxAddresses?: number
    dailySummaries?: boolean
    aiInsights?: boolean
    digestFrequency?: string[]
    
    // API product
    rateLimit?: number
    endpoints?: string[]
  }>().notNull(),
  
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Pricing plans for each product
export const plans = pgTable('plans', {
  id: text('id').primaryKey(), // 'analytics-free', 'analytics-pro'
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  
  // Pricing in cents
  priceMonthly: integer('price_monthly'),
  priceYearly: integer('price_yearly'),
  
  // Plan-specific limits override product defaults
  limits: jsonb('limits').$type<Record<string, any>>().default({}),
  
  // Stripe price IDs
  stripePriceIdMonthly: text('stripe_price_id_monthly'),
  stripePriceIdYearly: text('stripe_price_id_yearly'),
  
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (plan) => ({
  productIdIdx: index('plans_product_id_idx').on(plan.productId),
  slugIdx: index('plans_slug_idx').on(plan.slug),
}))

// User subscriptions to products
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id),
  
  status: text('status').notNull(), // 'active', 'cancelled', 'past_due', 'trialing'
  
  // Stripe billing
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  
  // Subscription lifecycle
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelledAt: timestamp('cancelled_at'),
  
  // Product-specific metadata
  metadata: jsonb('metadata').$type<{
    // Analytics product
    primaryNewsletterId?: string
    
    // Inbox product
    assignedInboxAddress?: string
    
    // Usage tracking
    usage?: Record<string, number>
  }>().default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (subscription) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(subscription.userId),
  productIdIdx: index('subscriptions_product_id_idx').on(subscription.productId),
  statusIdx: index('subscriptions_status_idx').on(subscription.status),
  stripeSubIdx: index('subscriptions_stripe_sub_idx').on(subscription.stripeSubscriptionId),
  userProductUnique: unique('subscriptions_user_product_unique').on(
    subscription.userId, 
    subscription.productId
  ),
}))

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert