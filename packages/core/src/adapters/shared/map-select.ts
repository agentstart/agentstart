/* agent-frontmatter:start
AGENT: Adapter select helpers
PURPOSE: Provide reusable helpers for translating select arrays into driver formats
USAGE: mapSelectToObject(select, model, normalizer, () => true)
EXPORTS: mapSelectToObject
FEATURES:
  - Normalizes field names consistently across adapters
  - Avoids duplicating select-to-object conversion logic
SEARCHABLE: adapter select helper, select normalization, projection helper
agent-frontmatter:end */

/**
 * Converts a string[] selection into a driver-specific object map while applying
 * the adapter's field normalization rules.
 */
export function mapSelectToObject<T>(
  select: string[] | undefined,
  model: string,
  normalizeFieldName: (model: string, field: string) => string,
  mapValue: (field: string) => T,
): Record<string, T> | undefined {
  if (!select?.length) {
    return undefined;
  }
  return Object.fromEntries(
    select.map((field) => [normalizeFieldName(model, field), mapValue(field)]),
  );
}
