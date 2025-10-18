import type { Adapter, AgentStackOptions } from "agent-stack";

export type SchemaGenerator = (opts: {
  file?: string;
  adapter: Adapter;
  options: Omit<AgentStackOptions, "agent">;
}) => Promise<{
  code?: string;
  fileName: string;
  overwrite?: boolean;
  append?: boolean;
}>;
