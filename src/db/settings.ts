import { db } from './index.ts';
import { settings } from './schema.ts';
import { eq } from 'drizzle-orm';

export interface AppSettings {
  // Applies to a vendor plan whose commissionPercent/feeFcfa is NULL.
  defaultCommissionPercent: number;
  defaultFeeFcfa: number;
  home: {
    featuredTitle: string;
    newArrivalsTitle: string;
    featuredEnabled: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCommissionPercent: 5,
  defaultFeeFcfa: 0,
  home: {
    featuredTitle: 'En vedette',
    newArrivalsTitle: 'Nouveautés',
    featuredEnabled: true,
  },
};

/** Reads every settings row and overlays it on the defaults, key by key. */
export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const result: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const row of rows) {
    try {
      const value = JSON.parse(row.value);
      if (row.key === 'home') {
        result.home = { ...result.home, ...value };
      } else if (row.key in result) {
        (result as any)[row.key] = value;
      }
    } catch {
      // A hand-edited or corrupted row shouldn't take the whole settings
      // read down with it — fall back to the default for that key.
    }
  }
  return result;
}

export async function setSetting(key: keyof AppSettings, value: unknown) {
  const encoded = JSON.stringify(value);
  await db
    .insert(settings)
    .values({ key, value: encoded })
    .onConflictDoUpdate({ target: settings.key, set: { value: encoded, updatedAt: new Date() } });
}

export async function getEffectiveFees(plan: { commissionPercent: number | null; feeFcfa: number | null } | null) {
  const app = await getSettings();
  return {
    commissionPercent: plan?.commissionPercent ?? app.defaultCommissionPercent,
    feeFcfa: plan?.feeFcfa ?? app.defaultFeeFcfa,
  };
}
