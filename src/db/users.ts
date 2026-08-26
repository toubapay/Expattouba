import { db } from './index.ts';
import { users, vendors } from './schema.ts';
import { eq } from 'drizzle-orm';

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
    if (existing[0].pin !== pin) {
      throw new Error('Invalid PIN');
    }
    return existing[0];
  }
  
  const uid = `phone:${phone}`;
  const result = await db.insert(users).values({
    uid,
    phoneNumber: phone,
    pin
  }).returning();
  
  return result[0];
}

export async function getUserWithVendor(uid: string) {
  const userList = await db.select().from(users).where(eq(users.uid, uid));
  if (userList.length === 0) return null;
  const user = userList[0];

  const vendorList = await db.select().from(vendors).where(eq(vendors.userId, user.id));
  return {
    ...user,
    vendor: vendorList.length > 0 ? vendorList[0] : null,
  };
}
