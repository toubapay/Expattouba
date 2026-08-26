import { relations } from 'drizzle-orm';
import { decimal, pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or Custom Phone UID
  email: text('email'), // Made optional since phone users won't have it initially
  phoneNumber: text('phone_number').unique(),
  pin: text('pin'), // 4-digit pin (hashed or plain for prototype)
  walletBalance: decimal('wallet_balance', { precision: 12, scale: 2 }).default('0.00'),
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
