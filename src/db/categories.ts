import { db } from './index.ts';
import { categories } from './schema.ts';
import { asc, eq } from 'drizzle-orm';

const SEED_CATEGORIES = [
  { name: 'Mode', icon: '👕', sortOrder: 0 },
  { name: 'Tech', icon: '📱', sortOrder: 1 },
  { name: 'Maison', icon: '🛋️', sortOrder: 2 },
  { name: 'Beauté', icon: '✨', sortOrder: 3 },
];

// Introduced after the initial seed above, so they can't go through the
// same "only when the table is empty" path — every deployment that's
// already booted once already has a non-empty categories table. Backfilled
// additively instead: insert-if-missing by name, on every boot, same
// "grant, never overwrite" spirit as ADMIN_EMAILS — an admin who already
// renamed or deleted one of these is never fought with on the next deploy.
const BACKFILL_CATEGORIES = [
  { name: 'Immobilier', icon: '🏠', sortOrder: 4, fieldSet: 'realEstate' },
  { name: 'Véhicules', icon: '🚗', sortOrder: 5, fieldSet: 'vehicle' },
  { name: 'Emploi', icon: '💼', sortOrder: 6, fieldSet: 'job' },
];

/** Copies the old hardcoded category list into an empty table, once, then
 * backfills any newer categories introduced since by name. */
export async function seedCategories() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length === 0) {
    await db.insert(categories).values(SEED_CATEGORIES);
  }
  for (const cat of BACKFILL_CATEGORIES) {
    const found = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, cat.name)).limit(1);
    if (found.length === 0) {
      await db.insert(categories).values(cat);
    }
  }
}

export async function listActiveCategories() {
  return db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder));
}

export async function listAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function createCategory(data: { name: string; icon?: string; sortOrder?: number; fieldSet?: string | null }) {
  const result = await db.insert(categories).values(data).returning();
  return result[0];
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; icon: string; sortOrder: number; active: boolean; fieldSet: string | null }>
) {
  const result = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return result[0] ?? null;
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}
