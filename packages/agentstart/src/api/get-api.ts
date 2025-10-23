/* agent-frontmatter:start
AGENT: Server-side API factory
PURPOSE: Create a typed oRPC client for invoking Agent Start routers on the server
USAGE: const api = getApi(context)
EXPORTS: getApi, AgentStartAPI
FEATURES:
  - Lazily instantiates router clients via a proxy
  - Always reads the latest agent context when invoking procedures
  - Throws descriptive errors when context is unavailable
SEARCHABLE: server api, getApi helper, orpc router client
agent-frontmatter:end */

import { createRouterClient, type RouterClient } from "@orpc/server";
import type { AgentStartOptions } from "@/types";
import { type Context, createContext } from "./context";
import { type AppRouter, appRouter } from "./router";

type HeadersLike = ConstructorParameters<typeof Headers>[0];

type ContextOverride = Partial<Omit<Context, "headers">> & {
  headers?: HeadersLike;
};

export type AgentStartAPI = RouterClient<AppRouter, ContextOverride>;

/**
 * Create a proxy that instantiates a fresh oRPC client on each property access.
 * Ensures the latest context is used whenever a procedure is invoked.
 */
export function getApi(options: AgentStartOptions): AgentStartAPI {
  const context = createContext(options as Context);
  return new Proxy({} as AgentStartAPI, {
    get(_target, property, receiver) {
      const client = createClient(context);
      const value = Reflect.get(client as object, property, receiver);
      return typeof value === "function" ? value.bind(client) : value;
    },
    has(_target, property) {
      const client = createClient(context);
      return Reflect.has(client as object, property);
    },
    ownKeys() {
      const client = createClient(context);
      return Reflect.ownKeys(client as object);
    },
    getOwnPropertyDescriptor(_target, property) {
      const client = createClient(context);
      return Reflect.getOwnPropertyDescriptor(client as object, property);
    },
  });
}

function createClient(context: Context): AgentStartAPI {
  return createRouterClient<AppRouter, ContextOverride>(appRouter, {
    context: (override = {}) => mergeContext(context, override),
  });
}

function mergeContext(base: Context, override: ContextOverride): Context {
  if (!override || isEmptyObject(override)) {
    return base;
  }

  return {
    ...base,
    ...override,
  } as Context;
}

function isEmptyObject(value: object): boolean {
  for (const key in value) {
    if (Object.hasOwn(value, key)) {
      return false;
    }
  }
  return true;
}
