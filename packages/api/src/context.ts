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

import type { AgentStackOptions } from "agent-stack";
import { memoryAdapter } from "agent-stack/adapters/memory";

export interface Context extends AgentStackOptions {
  headers: Headers;
  getUserId: (headers: Headers) => string | Promise<string>;
}

export interface CreateContextOptions extends Omit<Context, "getUserId"> {
  headers: Headers;
  memory?: AgentStackOptions["memory"];
  getUserId?: (headers: Headers) => string | Promise<string>;
}

export function createContext(opts: CreateContextOptions): Context {
  return {
    ...opts,
    getUserId: opts.getUserId ?? (() => "test-user-id"),
    memory: opts.memory ?? memoryAdapter(),
  };
}
