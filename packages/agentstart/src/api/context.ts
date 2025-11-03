/* agent-frontmatter:start
AGENT: Agent context factory
PURPOSE: Create runtime context objects for oRPC agent procedures
USAGE: createContext({ headers, instance, memory })
EXPORTS: Context, CreateContextOptions, createContext
FEATURES:
  - Injects the active Agent instance into RPC handlers
  - Provides a default in-memory adapter when none is supplied
  - Preserves request headers for downstream tooling
SEARCHABLE: agent context, rpc context, memory adapter
agent-frontmatter:end */

import { inMemoryAdapter } from "@agentstart/memory";
import type { AgentStartOptions } from "@agentstart/types";

export interface Context extends AgentStartOptions {
  headers: Headers;
  getUserId: (headers: Headers) => string | Promise<string>;
}

export interface CreateContextOptions extends Omit<Context, "getUserId"> {
  getUserId?: (headers: Headers) => string | Promise<string>;
}

export function createContext(opts: CreateContextOptions): Context {
  return {
    ...opts,
    getUserId: opts.getUserId ?? (() => "anonymous"),
    memory: opts.memory ?? inMemoryAdapter(),
    blob: opts.blob,
  };
}
