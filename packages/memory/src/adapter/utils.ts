/* agent-frontmatter:start
AGENT: Memory adapter utils
PURPOSE: Implements utils logic within packages/agentstart/src/memory/adapter.
USAGE: Import where utils functionality is required.
EXPORTS: withApplyDefault
FEATURES:
  - Belongs to packages/agentstart/src/memory/adapter in the AgentStart workspace
  - Provides utils utilities for consumers
SEARCHABLE: packages, agentstart, src, memory, adapter, utils
agent-frontmatter:end */

import type { FieldAttribute } from "@agentstart/types";

export function withApplyDefault(
  value: unknown,
  field: FieldAttribute,
  action: "create" | "update",
) {
  if (action === "update") {
    return value;
  }
  if (value === undefined || value === null) {
    if (field.defaultValue) {
      if (typeof field.defaultValue === "function") {
        return field.defaultValue();
      }
      return field.defaultValue;
    }
  }
  return value;
}
