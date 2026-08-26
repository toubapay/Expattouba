import { db } from './index.ts';
import { users, vendors } from './schema.ts';
import { eq } from 'drizzle-orm';
import { hashPin, isLegacyPin, verifyPin } from '../lib/pin.ts';

export async function getOrCreateUser(uid: string, email: string) {
  const result = await db.insert(users)
    .values({ uid, email })
    .onConflictDoUpdate({
      target: users.uid,
      set: { email },
    })
    .returning();

  return result[0];
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

export async function getUserWithVendor(uid: string) {
  const userList = await db.select().from(users).where(eq(users.uid, uid));
  if (userList.length === 0) return null;
  // pin is a credential (hashed or not) and this result is sent straight
  // back to the client as the /api/v1/auth/* response body — it must never
  // leave the server.
  const { pin, ...user } = userList[0];

  const vendorList = await db.select().from(vendors).where(eq(vendors.userId, user.id));
  return {
    ...user,
    vendor: vendorList.length > 0 ? vendorList[0] : null,
  };
}
