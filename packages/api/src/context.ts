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

import { type AgentStackOptions, memoryAdapter } from "@agent-stack/core";

export interface Context extends AgentStackOptions {
  headers: Headers;
}

export interface CreateContextOptions extends Context {
  headers: Headers;
  memory?: AgentStackOptions["memory"];
}

export function createContext(opts: CreateContextOptions): Context {
  return { ...opts, memory: opts.memory ?? memoryAdapter() };
}
