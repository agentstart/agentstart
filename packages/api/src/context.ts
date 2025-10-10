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

import {
  type Agent,
  type DatabaseAdapterInstance,
  memoryAdapter,
} from "@agent-stack/core";

export interface Context {
  headers: Headers;
  instance: Agent;
  memory: DatabaseAdapterInstance<unknown>;
}

export interface CreateContextOptions {
  headers: Headers;
  instance: Agent;
  memory?: DatabaseAdapterInstance<unknown>;
}

export function createContext(opts: CreateContextOptions): Context {
  return { ...opts, memory: opts.memory ?? memoryAdapter() };
}
