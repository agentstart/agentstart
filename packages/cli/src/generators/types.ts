import type { Adapter, AgentStartOptions } from "agentstart";

export type SchemaGenerator = (opts: {
  file?: string;
  adapter: Adapter;
  options: Omit<AgentStartOptions, "agent">;
}) => Promise<{
  code?: string;
  fileName: string;
  overwrite?: boolean;
  append?: boolean;
}>;
