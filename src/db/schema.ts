import { relations } from 'drizzle-orm';
import { decimal, integer, pgTable, text, timestamp, boolean, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or Custom Phone UID
  email: text('email'), // Made optional since phone users won't have it initially
  phoneNumber: text('phone_number').unique(),
  pin: text('pin'), // 4-digit pin (hashed or plain for prototype)
  walletBalance: decimal('wallet_balance', { precision: 12, scale: 2 }).default('0.00'),
  // Grants access to /admin. Set directly in the DB, or automatically on
  // first Google sign-in when the email is listed in ADMIN_EMAILS — there is
  // no separate admin login, admins are just users with this flag.
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  boutiqueName: text('boutique_name').notNull(),
  address: text('address'),
  whatsappNumber: text('whatsapp_number'),
  badgeStatus: text('badge_status').default('BRONZE'), // BRONZE, SILVER, GOLD
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const listings = pgTable('listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('FCFA'),
  status: text('status').default('ACTIVE'), // ACTIVE, SOLD, DRAFT
  image: text('image'),
  whatsapp: text('whatsapp'),
  category: text('category'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type'), // DEPOSIT, WITHDRAWAL, PAYMENT, TRANSFER
  status: text('status'), // PENDING, COMPLETED, FAILED
  gateway: text('gateway'), // WAVE, ORANGE_MONEY, MANUAL
  createdAt: timestamp('created_at').defaultNow(),
});

// Admin-editable home page categories rail. Replaces the hardcoded list that
// used to live in the frontend, so an admin can add/reorder/retire one
// without a redeploy.
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').default('🛍️'), // a single emoji, rendered as-is
  sortOrder: integer('sort_order').default(0),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generic app-settings key/value store (value is JSON-encoded text), for
// things like the global commission/fee defaults and home-page toggles.
// One row per key rather than a single JSON blob so an admin editing one
// setting can never clobber a concurrent edit to another.
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// A vendor subscription tier: how much it costs, how long it lasts, and
// what it unlocks. commissionPercent/feeFcfa are nullable on purpose —
// NULL means "inherit the global default from settings", 0 means
// "explicitly free/none for this plan". Collapsing the two would make a
// deliberately fee-free plan indistinguishable from an unconfigured one.
export const vendorPlans = pgTable('vendor_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  priceFcfa: integer('price_fcfa').notNull(),
  durationDays: integer('duration_days').notNull(),
  maxListings: integer('max_listings'), // NULL = unlimited
  featuredHome: boolean('featured_home').default(false),
  priorityRank: integer('priority_rank').default(0), // lower sorts first in feed
  commissionPercent: integer('commission_percent'), // NULL = inherit global
  feeFcfa: integer('fee_fcfa'), // NULL = inherit global
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// A vendor's purchase of a plan for a period. History is kept (never
// deleted) so past revenue and what a vendor's listings were entitled to
// at the time stay answerable; "current plan" is whichever row has
// status ACTIVE and the latest expiresAt.
export const vendorSubscriptions = pgTable('vendor_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
  planId: uuid('plan_id').references(() => vendorPlans.id).notNull(),
  status: text('status').default('ACTIVE'), // ACTIVE, EXPIRED, CANCELLED
  startedAt: timestamp('started_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  pricePaidFcfa: integer('price_paid_fcfa').notNull(), // snapshot: a later price change can't rewrite history
  createdAt: timestamp('created_at').defaultNow(),
});

// One thread per (listing, buyer) pair, so a buyer's messages about two
// different listings from the same vendor don't merge into one
// conversation the vendor can't tell apart.
export const chatThreads = pgTable(
  'chat_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
    vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
    buyerUid: text('buyer_uid').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    // Enforced in the database, not just checked-then-inserted in app code —
    // two concurrent "open chat" requests for the same (listing, buyer) must
    // resolve to one thread, not a coin-flip pair of them (this raced for
    // real under React StrictMode's double effect invocation in dev).
    uniqueIndex('chat_threads_listing_buyer_idx').on(table.listingId, table.buyerUid),
  ]
);

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => chatThreads.id, { onDelete: 'cascade' }).notNull(),
  senderUid: text('sender_uid').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [users.id],
    references: [vendors.userId],
  }),
  transactions: many(transactions),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  vendor: one(vendors, {
    fields: [listings.vendorId],
    references: [vendors.id],
  }),
}));

export const vendorSubscriptionsRelations = relations(vendorSubscriptions, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorSubscriptions.vendorId],
    references: [vendors.id],
  }),
  plan: one(vendorPlans, {
    fields: [vendorSubscriptions.planId],
    references: [vendorPlans.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  listing: one(listings, {
    fields: [chatThreads.listingId],
    references: [listings.id],
  }),
  vendor: one(vendors, {
    fields: [chatThreads.vendorId],
    references: [vendors.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
}));
