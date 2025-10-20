/* agent-frontmatter:start
AGENT: Server-side API factory
PURPOSE: Create a typed oRPC client for invoking Agent Start routers on the server
USAGE: const api = getApi(context)
EXPORTS: getApi, AgentStartAPI, ContextResolver
FEATURES:
  - Lazily instantiates router clients via a proxy
  - Always reads the latest agent context when invoking procedures
  - Throws descriptive errors when context is unavailable
SEARCHABLE: server api, getApi helper, orpc router client
agent-frontmatter:end */

import { AgentStartError } from "@agentstart/utils";
import { createRouterClient, type RouterClient } from "@orpc/server";
import type { Context } from "./context";
import { type AppRouter, appRouter } from "./router";

export type AgentStartAPI = RouterClient<AppRouter>;

export type ContextResolver = { current: Context | null | undefined };

/**
 * Create a proxy that instantiates a fresh oRPC client on each property access.
 * Ensures the latest context is used whenever a procedure is invoked.
 */
export function getApi(resolver: ContextResolver): AgentStartAPI {
  const resolveContext = createContextResolver(resolver);

  return new Proxy({} as AgentStartAPI, {
    get(_target, property, receiver) {
      const client = createClient(resolveContext());
      const value = Reflect.get(client as object, property, receiver);
      return typeof value === "function" ? value.bind(client) : value;
    },
    has(_target, property) {
      const client = createClient(resolveContext());
      return Reflect.has(client as object, property);
    },
    ownKeys() {
      const client = createClient(resolveContext());
      return Reflect.ownKeys(client as object);
    },
    getOwnPropertyDescriptor(_target, property) {
      const client = createClient(resolveContext());
      return Reflect.getOwnPropertyDescriptor(client as object, property);
    },
  });
}

function createContextResolver(resolver: ContextResolver): () => Context {
  return () => {
    const value = resolver.current;

    if (!value) {
      throw new AgentStartError(
        "CONTEXT_UNAVAILABLE",
        "Agent context is not available. Call the API within an active request handler.",
      );
    }

    return value;
  };
}

function createClient(context: Context): AgentStartAPI {
  return createRouterClient(appRouter, {
    context,
  });
}
