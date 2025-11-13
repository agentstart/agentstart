/* agent-frontmatter:start
AGENT: Server-side API factory
PURPOSE: Create a typed oRPC client for invoking Agent Start routers on the server
USAGE: const api = getApi(context)
EXPORTS: getApi, AgentStartAPI
FEATURES:
  - Lazily instantiates router clients via a proxy
  - Always reads the latest agent context when invoking procedures
  - Throws descriptive errors when context is unavailable
  - Dynamically loads routers based on configuration
SEARCHABLE: server api, getApi helper, orpc router client
agent-frontmatter:end */

import type { AgentStartOptions } from "@agentstart/types";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { type Context, createContext } from "./context";
import { type AppRouter, createAppRouter } from "./router";

type HeadersLike = ConstructorParameters<typeof Headers>[0];

type ContextOverride = Partial<Omit<Context, "headers">> & {
  headers?: HeadersLike;
};

export type AgentStartAPI = RouterClient<AppRouter, ContextOverride>;

/**
 * Create a proxy that lazily initializes the router and creates oRPC client.
 * Ensures the latest context is used whenever a procedure is invoked.
 * Router is created only once and cached for subsequent calls.
 */
export function getApi(options: AgentStartOptions): AgentStartAPI {
  const context = createContext(options as Context);

  // Cache the router promise to avoid recreating it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routerPromise: Promise<any> | null = null;

  const ensureRouter = async () => {
    if (!routerPromise) {
      routerPromise = createAppRouter({
        middleware: options.middleware,
        enabledRouters: {
          thread: true,
          message: true,
          blob: true,
          config: true,
          sandbox: !!options.sandbox,
        },
      });
    }
    return routerPromise;
  };

  return new Proxy({} as AgentStartAPI, {
    get(_target, property, receiver) {
      // For each router property (thread, message, etc.)
      // Return a proxy that handles the actual method calls
      return new Proxy(
        {},
        {
          get(_routerTarget, method) {
            // Return an async function that waits for router initialization
            return async (...args: unknown[]) => {
              const router = await ensureRouter();
              const client = createRouterClient(router, {
                context: (override = {}) => mergeContext(context, override as ContextOverride),
              });
              const routerObj = Reflect.get(client as object, property, receiver);
              const methodFn = Reflect.get(routerObj, method);
              return methodFn.apply(routerObj, args);
            };
          },
        },
      );
    },
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
