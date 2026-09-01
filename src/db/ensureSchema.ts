import { createPool } from './index.ts';

/**
 * Runs on every boot, before anything else touches the database — same
 * pattern as the sister app's ensureSchema(): every statement is
 * `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN IF NOT
 * EXISTS`, so this is safe to run against an empty database, a database
 * already on the current shape, or a database left over from an older
 * version of schema.ts — and adding a column later needs no separate
 * migration step, just a new ALTER statement here alongside the matching
 * change in schema.ts.
 *
 * This exists instead of relying on `npm run db:push` (drizzle-kit) as a
 * required manual/CI step: drizzle-kit push can prompt interactively for
 * confirmation on ambiguous changes, which has no good answer in an
 * unattended deploy. `db:push` still works for local dev convenience, but
 * production schema sync no longer depends on anyone remembering to run
 * it.
 */
export async function ensureSchema() {
  const pool = createPool();
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      uid text NOT NULL UNIQUE,
      email text,
      phone_number text UNIQUE,
      pin text,
      wallet_balance decimal(12,2) DEFAULT 0.00,
      created_at timestamp DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

    CREATE TABLE IF NOT EXISTS vendors (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      boutique_name text NOT NULL,
      address text,
      whatsapp_number text,
      badge_status text DEFAULT 'BRONZE',
      is_verified boolean DEFAULT false,
      created_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS listings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      price decimal(12,2) NOT NULL,
      currency text DEFAULT 'FCFA',
      status text DEFAULT 'ACTIVE',
      image text,
      whatsapp text,
      created_at timestamp DEFAULT now()
    );
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS category text;

    CREATE TABLE IF NOT EXISTS transactions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id),
      amount decimal(12,2) NOT NULL,
      type text,
      status text,
      gateway text,
      created_at timestamp DEFAULT now()
    );
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings(id);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note text;

    CREATE TABLE IF NOT EXISTS categories (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL,
      icon text DEFAULT '🛍️',
      sort_order integer DEFAULT 0,
      active boolean DEFAULT true,
      created_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vendor_plans (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL,
      price_fcfa integer NOT NULL,
      duration_days integer NOT NULL,
      max_listings integer,
      featured_home boolean DEFAULT false,
      priority_rank integer DEFAULT 0,
      commission_percent integer,
      fee_fcfa integer,
      active boolean DEFAULT true,
      created_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vendor_subscriptions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      plan_id uuid NOT NULL REFERENCES vendor_plans(id),
      status text DEFAULT 'ACTIVE',
      started_at timestamp DEFAULT now(),
      expires_at timestamp NOT NULL,
      price_paid_fcfa integer NOT NULL,
      created_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS plan_orders (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      plan_id uuid NOT NULL REFERENCES vendor_plans(id),
      invoice_token text NOT NULL UNIQUE,
      amount_fcfa integer NOT NULL,
      status text DEFAULT 'PENDING',
      created_at timestamp DEFAULT now(),
      completed_at timestamp
    );

    CREATE TABLE IF NOT EXISTS chat_threads (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      buyer_uid text NOT NULL,
      created_at timestamp DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_listing_buyer_idx ON chat_threads(listing_id, buyer_uid);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      sender_uid text NOT NULL,
      body text NOT NULL,
      created_at timestamp DEFAULT now()
    );
  `);
}
