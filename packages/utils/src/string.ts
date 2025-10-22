/* agent-frontmatter:start
AGENT: Utility module
PURPOSE: Offers string transformation helpers for casing.
USAGE: Use when normalizing identifiers across the toolkit.
EXPORTS: capitalizeFirstLetter, convertToSnakeCase
FEATURES:
  - Capitalizes sentences for display
  - Converts camelCase into snake_case identifiers
SEARCHABLE: packages, utils, src, string, case
agent-frontmatter:end */

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function convertToSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
