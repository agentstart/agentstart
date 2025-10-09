/* agent-frontmatter:start
AGENT: Adapter naming helpers
PURPOSE: Provide shared utilities for model and field name normalization
USAGE: Import to pluralize model names or convert camelCase fields
EXPORTS: pluralizeModel, camelToSnake
FEATURES:
  - Opinionated pluralization helper for table names
  - Deterministic camelCase → snake_case conversion
SEARCHABLE: adapter naming, pluralize, camel to snake
agent-frontmatter:end */

/**
 * Applies a minimal pluralisation strategy suitable for common table names.
 */
export function pluralizeModel(model: string): string {
  if (model.endsWith("y")) {
    return `${model.slice(0, -1)}ies`;
  }
  if (model.endsWith("s")) {
    return `${model}es`;
  }
  return `${model}s`;
}

/**
 * Converts camelCase property names into snake_case column identifiers.
 */
export function camelToSnake(field: string): string {
  return field.replace(/([A-Z])/g, "_$1").toLowerCase();
}
