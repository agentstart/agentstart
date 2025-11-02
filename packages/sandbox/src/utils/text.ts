/* agent-frontmatter:start
AGENT: Sandbox utility helpers
PURPOSE: Provide shared helper functions for command interpolation and chunk conversion across sandbox adapters
USAGE: Import to reconstruct shell commands and normalize stream output to text
EXPORTS: chunkToString, interpolateTemplate
FEATURES:
  - Rebuilds template literal commands in a standalone helper
  - Converts stdout/stderr chunks to UTF-8 strings
SEARCHABLE: sandbox utils, command interpolation, stream chunk normalization
agent-frontmatter:end */

/**
 * Convert stdout/stderr chunks to a UTF-8 string for consistent handling.
 */
export const chunkToString = (chunk: unknown): string => {
  if (typeof chunk === "string") return chunk;
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk).toString("utf8");
  }
  if (chunk === null || chunk === undefined) return "";
  return String(chunk);
};

/**
 * Rebuild a command string from template literal parts.
 */
export const interpolateTemplate = (
  strings: TemplateStringsArray,
  values: unknown[],
): string =>
  strings.reduce(
    (command, segment, index) =>
      command + segment + (index < values.length ? String(values[index]) : ""),
    "",
  );
