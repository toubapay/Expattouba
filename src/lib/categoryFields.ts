// Shared between server.ts/routes (validation) and the React components
// (PostView's dynamic form, ProductDetailView/HomeView's attribute
// display) — one definition of what each category's extra fields are, so
// the two can't drift into disagreeing about what a "vehicle" listing
// looks like.

/** Senegal's 14 administrative regions — used as the city/location filter
 * everywhere (post-listing, home search, listing display). A fixed list
 * rather than free text: it's what makes "browse by city" a filter
 * instead of a fuzzy text match against however each vendor happened to
 * spell their neighborhood. */
export const SENEGAL_CITIES = [
  'Dakar',
  'Thiès',
  'Diourbel',
  'Fatick',
  'Kaffrine',
  'Kaolack',
  'Kédougou',
  'Kolda',
  'Louga',
  'Matam',
  'Saint-Louis',
  'Sédhiou',
  'Tambacounda',
  'Ziguinchor',
] as const;

export type FieldType = 'text' | 'number' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  // Appended after the raw value when rendering ("120" -> "120 m²").
  unit?: string;
}

export type FieldSetKey = 'realEstate' | 'vehicle' | 'job';

export const FIELD_SET_LABELS: Record<FieldSetKey, string> = {
  realEstate: 'Immobilier',
  vehicle: 'Véhicules',
  job: 'Emploi',
};

export const FIELD_SETS: Record<FieldSetKey, FieldDef[]> = {
  realEstate: [
    { key: 'transactionType', label: 'Transaction', type: 'select', options: ['Vente', 'Location'] },
    { key: 'propertyType', label: 'Type de bien', type: 'select', options: ['Appartement', 'Maison', 'Villa', 'Studio', 'Terrain', 'Bureau'] },
    { key: 'bedrooms', label: 'Chambres', type: 'number' },
    { key: 'bathrooms', label: 'Salles de bain', type: 'number' },
    { key: 'surfaceM2', label: 'Surface', type: 'number', unit: 'm²' },
  ],
  vehicle: [
    { key: 'vehicleType', label: 'Type', type: 'select', options: ['Voiture', 'Moto', 'Camion', 'Autre'] },
    { key: 'brand', label: 'Marque', type: 'text' },
    { key: 'model', label: 'Modèle', type: 'text' },
    { key: 'year', label: 'Année', type: 'number' },
    { key: 'mileageKm', label: 'Kilométrage', type: 'number', unit: 'km' },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['Manuelle', 'Automatique'] },
    { key: 'condition', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
  ],
  job: [
    { key: 'contractType', label: 'Type de contrat', type: 'select', options: ['CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel'] },
    { key: 'experienceLevel', label: "Niveau d'expérience", type: 'select', options: ['Débutant', 'Intermédiaire', 'Senior'] },
    { key: 'salaryMin', label: 'Salaire min', type: 'number', unit: 'FCFA' },
    { key: 'salaryMax', label: 'Salaire max', type: 'number', unit: 'FCFA' },
  ],
};

/** Flat key -> field-def lookup across every field set, so a display
 * component can render whatever's actually present in listings.attributes
 * without first knowing (or being passed) which category/field-set the
 * listing belongs to. Two field sets never share a key, so this is safe. */
export const ALL_FIELDS: Record<string, FieldDef> = Object.fromEntries(
  Object.values(FIELD_SETS).flat().map((f) => [f.key, f])
);

function formatValue(def: FieldDef, value: string | number): string {
  if (def.type === 'number' && def.unit === 'FCFA') {
    return `${Number(value).toLocaleString('fr-FR')} ${def.unit}`;
  }
  return def.unit ? `${value} ${def.unit}` : String(value);
}

/** A short one-line summary for a listing card — e.g.
 * "Vente • 3 chambres • 120 m²" or "2018 • 45 000 km • Automatique".
 * Picks the first few attributes present, in field-set order, rather than
 * every one, since a card has room for a line, not a spec sheet. */
export function summarizeAttributes(attributes: Record<string, string | number> | null | undefined, max = 3): string {
  if (!attributes) return '';
  const parts: string[] = [];
  for (const key of Object.keys(attributes)) {
    const def = ALL_FIELDS[key];
    const value = attributes[key];
    if (!def || value === '' || value == null) continue;
    parts.push(formatValue(def, value));
    if (parts.length >= max) break;
  }
  return parts.join(' • ');
}

/** Full label:value rows for the product detail page. */
export function attributeRows(attributes: Record<string, string | number> | null | undefined): { label: string; value: string }[] {
  if (!attributes) return [];
  return Object.entries(attributes)
    .filter(([, value]) => value !== '' && value != null)
    .map(([key, value]) => {
      const def = ALL_FIELDS[key];
      return def ? { label: def.label, value: formatValue(def, value) } : null;
    })
    .filter((row): row is { label: string; value: string } => row !== null);
}
