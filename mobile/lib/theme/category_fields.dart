// Ports src/lib/categoryFields.ts — one definition (there, and here) of
// what each category's extra fields are, so the two clients can't drift
// into disagreeing about what a "vehicle" listing looks like. Keep this
// file's contents in sync with the TS source by hand; there's no shared
// package between a Dart client and a TS backend to do it automatically.

/// Senegal's 14 administrative regions — the city/location filter
/// everywhere (post-listing, home search, listing display). A fixed list
/// rather than free text: it's what makes "browse by city" a filter
/// instead of a fuzzy text match against however a vendor spelled their
/// neighborhood.
const List<String> kSenegalCities = [
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
];

enum FieldType { text, number, select }

class FieldDef {
  final String key;
  final String label;
  final FieldType type;
  final List<String>? options;
  // Appended after the raw value when rendering ("120" -> "120 m²").
  final String? unit;

  const FieldDef({required this.key, required this.label, required this.type, this.options, this.unit});
}

const Map<String, String> kFieldSetLabels = {
  'realEstate': 'Immobilier',
  'vehicle': 'Véhicules',
  'job': 'Emploi',
};

const Map<String, List<FieldDef>> kFieldSets = {
  'realEstate': [
    FieldDef(key: 'transactionType', label: 'Transaction', type: FieldType.select, options: ['Vente', 'Location']),
    FieldDef(key: 'propertyType', label: 'Type de bien', type: FieldType.select, options: ['Appartement', 'Maison', 'Villa', 'Studio', 'Terrain', 'Bureau']),
    FieldDef(key: 'bedrooms', label: 'Chambres', type: FieldType.number),
    FieldDef(key: 'bathrooms', label: 'Salles de bain', type: FieldType.number),
    FieldDef(key: 'surfaceM2', label: 'Surface', type: FieldType.number, unit: 'm²'),
  ],
  'vehicle': [
    FieldDef(key: 'vehicleType', label: 'Type', type: FieldType.select, options: ['Voiture', 'Moto', 'Camion', 'Autre']),
    FieldDef(key: 'brand', label: 'Marque', type: FieldType.text),
    FieldDef(key: 'model', label: 'Modèle', type: FieldType.text),
    FieldDef(key: 'year', label: 'Année', type: FieldType.number),
    FieldDef(key: 'mileageKm', label: 'Kilométrage', type: FieldType.number, unit: 'km'),
    FieldDef(key: 'transmission', label: 'Transmission', type: FieldType.select, options: ['Manuelle', 'Automatique']),
    FieldDef(key: 'condition', label: 'État', type: FieldType.select, options: ['Neuf', 'Occasion']),
  ],
  'job': [
    FieldDef(key: 'contractType', label: 'Type de contrat', type: FieldType.select, options: ['CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel']),
    FieldDef(key: 'experienceLevel', label: "Niveau d'expérience", type: FieldType.select, options: ['Débutant', 'Intermédiaire', 'Senior']),
    FieldDef(key: 'salaryMin', label: 'Salaire min', type: FieldType.number, unit: 'FCFA'),
    FieldDef(key: 'salaryMax', label: 'Salaire max', type: FieldType.number, unit: 'FCFA'),
  ],
};

/// Fixed field order across every field set — deliberately NOT derived by
/// iterating a listing's own attributes map key-by-key. The backend
/// stores attributes in Postgres jsonb, which does not preserve the key
/// order they were written with (confirmed the hard way on the web
/// client: a real-estate chip showed "3 • 2", i.e. bedrooms/bathrooms,
/// instead of the far more useful "Location • Appartement" this order is
/// meant to lead with). Always walk this list and look values up by key,
/// never Map.keys on the attributes themselves.
final List<FieldDef> kFieldOrder = kFieldSets.values.expand((f) => f).toList();

final Map<String, FieldDef> kAllFields = {for (final f in kFieldOrder) f.key: f};

String _formatValue(FieldDef def, dynamic value) {
  if (def.type == FieldType.number && def.unit == 'FCFA') {
    final n = num.tryParse(value.toString()) ?? 0;
    return '${_thousands(n)} ${def.unit}';
  }
  return def.unit != null ? '$value ${def.unit}' : value.toString();
}

String _thousands(num n) {
  final s = n.round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(s[i]);
  }
  return buffer.toString();
}

/// A short one-line summary for a listing card — e.g. "Location •
/// Appartement • 120 m²" or "2018 • Toyota • Automatique". Picks the
/// first few attributes present, in field-set order, not every one,
/// since a card has room for a line, not a spec sheet.
String summarizeAttributes(Map<String, dynamic>? attributes, {int max = 3}) {
  if (attributes == null) return '';
  final parts = <String>[];
  for (final def in kFieldOrder) {
    final value = attributes[def.key];
    if (value == null || value.toString().isEmpty) continue;
    parts.add(_formatValue(def, value));
    if (parts.length >= max) break;
  }
  return parts.join(' • ');
}

class AttributeRow {
  final String label;
  final String value;
  const AttributeRow({required this.label, required this.value});
}

/// Full label:value rows for the product detail screen — same field-set
/// ordering as summarizeAttributes, for the same reason.
List<AttributeRow> attributeRows(Map<String, dynamic>? attributes) {
  if (attributes == null) return [];
  final rows = <AttributeRow>[];
  for (final def in kFieldOrder) {
    final value = attributes[def.key];
    if (value == null || value.toString().isEmpty) continue;
    rows.add(AttributeRow(label: def.label, value: _formatValue(def, value)));
  }
  return rows;
}
