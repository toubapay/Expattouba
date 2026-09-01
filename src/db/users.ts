import { db } from './index.ts';
import { users, vendors } from './schema.ts';
import { eq } from 'drizzle-orm';
import { hashPin, isLegacyPin, verifyPin } from '../lib/pin.ts';

export async function getOrCreateUser(uid: string, email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const grantsAdmin = !!email && adminEmails.includes(email.toLowerCase());

  const result = await db.insert(users)
    .values({ uid, email, isAdmin: grantsAdmin })
    .onConflictDoUpdate({
      target: users.uid,
      // Only ever grants admin here, never revokes it — an ADMIN_EMAILS
      // entry dropping out on the next deploy shouldn't silently demote
      // someone; that's an explicit action via the admin users API instead.
      set: grantsAdmin ? { email, isAdmin: true } : { email },
    })
    .returning();

  return result[0];
}

/**
 * Bootstraps (or re-syncs) one admin account from SUPERADMIN_EMAIL /
 * SUPERADMIN_PASSWORD env vars, run on every boot alongside ensureSchema.
 * Unlike ADMIN_EMAILS (which only ever grants, never revokes, so a
 * customer's admin flag can't be silently pulled by a redeploy), this is a
 * deliberate bootstrap knob rather than customer state: the whole point is
 * a working login that doesn't depend on Google/ADMIN_EMAILS being
 * correctly wired, so the password is re-synced to match the env var on
 * every boot — rotate it there and it takes effect on the next deploy.
 *
 * uid follows the same `<kind>:<identifier>` convention as phone accounts
 * (`phone:${phone}`) rather than reusing a real email as the uid, so this
 * never collides with a Google-authenticated row that happens to share the
 * same email address — the two stay entirely separate accounts.
 */
export async function ensureSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) return;

  const uid = `admin:${email}`;
  const passwordHash = hashPin(password);
  await db.insert(users)
    .values({ uid, email, isAdmin: true, passwordHash })
    .onConflictDoUpdate({
      target: users.uid,
      set: { email, isAdmin: true, passwordHash },
    });
}

/** Email+password login for the superadmin account only — regular accounts
 * (Google or phone/PIN) never have a passwordHash, so this can't be used to
 * authenticate as them even if someone guessed their email. */
export async function verifyAdminLogin(email: string, password: string) {
  const rows = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  const admin = rows.find((u) => u.isAdmin && u.passwordHash);
  if (!admin || !admin.passwordHash || !verifyPin(password, admin.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  return admin;
}

export async function getOrCreatePhoneUser(phone: string, pin: string) {
  const existing = await db.select().from(users).where(eq(users.phoneNumber, phone));
  if (existing.length > 0) {
    const stored = existing[0].pin;
    if (!stored || !verifyPin(pin, stored)) {
      throw new Error('Invalid PIN');
    }
    // Migrate-on-read: a match against a legacy plaintext PIN is rehashed
    // immediately, so there's no separate migration step and no window
    // where a correct login doesn't upgrade the stored value.
    if (isLegacyPin(stored)) {
      await db.update(users).set({ pin: hashPin(pin) }).where(eq(users.id, existing[0].id));
    }
    return existing[0];
  }

  const uid = `phone:${phone}`;
  const result = await db.insert(users).values({
    uid,
    phoneNumber: phone,
    pin: hashPin(pin)
  }).returning();

  return result[0];
}

/** Just the vendor id behind a uid, or null if they aren't a vendor — used
 * by chat's ownership checks, which don't need the rest of the profile. */
export async function getVendorIdForUid(uid: string) {
  const rows = await db
    .select({ vendorId: vendors.id })
    .from(users)
    .innerJoin(vendors, eq(vendors.userId, users.id))
    .where(eq(users.uid, uid))
    .limit(1);
  return rows[0]?.vendorId ?? null;
}

export async function getUserWithVendor(uid: string) {
  const userList = await db.select().from(users).where(eq(users.uid, uid));
  if (userList.length === 0) return null;
  // pin and passwordHash are credentials (hashed or not) and this result is
  // sent straight back to the client as the /api/v1/auth/* response body —
  // neither must ever leave the server.
  const { pin, passwordHash, ...user } = userList[0];

  const vendorList = await db.select().from(vendors).where(eq(vendors.userId, user.id));
  return {
    ...user,
    vendor: vendorList.length > 0 ? vendorList[0] : null,
  };
}
