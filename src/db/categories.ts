import { db } from './index.ts';
import { categories } from './schema.ts';
import { asc, eq } from 'drizzle-orm';

const SEED_CATEGORIES = [
  { name: 'Mode', icon: '👕', sortOrder: 0 },
  { name: 'Tech', icon: '📱', sortOrder: 1 },
  { name: 'Maison', icon: '🛋️', sortOrder: 2 },
  { name: 'Beauté', icon: '✨', sortOrder: 3 },
];

/** Copies the old hardcoded category list into an empty table, once. */
export async function seedCategories() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) return;
  await db.insert(categories).values(SEED_CATEGORIES);
}

export async function listActiveCategories() {
  return db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder));
}

export async function listAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function createCategory(data: { name: string; icon?: string; sortOrder?: number }) {
  const result = await db.insert(categories).values(data).returning();
  return result[0];
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; icon: string; sortOrder: number; active: boolean }>
) {
  const result = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return result[0] ?? null;
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}
