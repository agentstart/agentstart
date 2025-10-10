/* agent-frontmatter:start
AGENT: Shared adapter helpers
PURPOSE: Centralize reusable adapter utilities
USAGE: import { mapSelectToObject } from "@agent-stack/core/adapters/shared"
EXPORTS: mapSelectToObject
FEATURES:
  - Aggregates shared adapter utilities
  - Keeps helper discovery simple
SEARCHABLE: adapter shared helpers, select helper, adapter utilities
agent-frontmatter:end */

export * from "./debug";
export * from "./map-select";
export * from "./naming";
export * from "./transforms";
export * from "./where";
