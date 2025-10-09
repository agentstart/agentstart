/* agent-frontmatter:start
AGENT: oRPC context creation
PURPOSE: Create request context with auth, database, and session
USAGE: Used by oRPC router for all procedures
FEATURES:
  - Authentication context from Better Auth
  - Database connection
  - User session handling
  - Request headers access
SEARCHABLE: orpc context, api context, auth context
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
