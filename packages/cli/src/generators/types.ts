/* agent-frontmatter:start
AGENT: CLI generator types
PURPOSE: Defines shared generator type signatures for CLI schema emitters.
USAGE: Import to enforce consistent generator contracts.
EXPORTS: SchemaGenerator
FEATURES:
  - Specifies output payload shape for schema generators
  - Ensures adapters provide consistent generator options
SEARCHABLE: packages, cli, src, generators, types, generator
agent-frontmatter:end */

import type { MemoryAdapter } from "@agentstart/types";
import type { AgentStartOptions } from "agentstart";

export type SchemaGenerator = (opts: {
  file?: string;
  adapter: MemoryAdapter;
  options: Omit<AgentStartOptions, "agent">;
}) => Promise<{
  code?: string;
  fileName: string;
  overwrite?: boolean;
  append?: boolean;
}>;
