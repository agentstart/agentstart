/* agent-frontmatter:start
AGENT: CLI utility module
PURPOSE: Formats millisecond durations into human-readable strings.
USAGE: Use when reporting timings in CLI output.
EXPORTS: formatMilliseconds
FEATURES:
  - Supports sub-second and second-level formatting
  - Validates non-negative input before formatting
SEARCHABLE: packages, cli, src, utils, format, ms, duration
agent-frontmatter:end */

/**
 * Only supports up to seconds.
 */
export function formatMilliseconds(ms: number) {
  if (ms < 0) {
    throw new Error("Milliseconds cannot be negative");
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;

  return `${seconds}s ${milliseconds}ms`;
}
