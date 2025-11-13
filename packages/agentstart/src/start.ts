/* agent-frontmatter:start
AGENT: Agent runtime entrypoint
PURPOSE: Expose the oRPC handler and server-side API for Agent Start
USAGE: const runtime = agentStart({ agent, memory })
EXPORTS: agentStart
FEATURES:
  - Creates a fetch-compatible RPC handler
  - Binds request-specific context for router execution
  - Provides a server-side API client via getApi
  - Supports user-defined middleware injection
SEARCHABLE: agent runtime, orpc handler, server api
agent-frontmatter:end */

import type { AgentStartOptions } from "@agentstart/types";
import { RPCHandler } from "@orpc/server/fetch";
import type { Context, CreateContextOptions } from "@/api";
import { createAppRouter, createContext } from "@/api";
import { getApi } from "@/api/get-api";

export function agentStart(options: AgentStartOptions) {
  const context = { current: null as Context | null };

  return {
    handler: async (request: Request) => {
      const basePath = options.basePath ?? ("/api/agent" as const);

      const router = await createAppRouter({
        middleware: options.middleware,
        enabledRouters: {
          thread: true,
          message: true,
          config: true,
          blob: !!options.blob,
          sandbox: !!options.sandbox,
        },
      });
      const rpcHandler = new RPCHandler(router);

      const contextOptions: CreateContextOptions = {
        headers: new Headers(request.headers),
        ...options,
      };

      context.current = createContext(contextOptions);

      const { response } = await rpcHandler.handle(request, {
        prefix: basePath,
        context: context.current,
      });

      return response ?? new Response("Not found", { status: 404 });
    },
    options,
    api: getApi(options),

    get $$context() {
      return context.current;
    },
  };
}

export type AgentStart = ReturnType<typeof agentStart>;
