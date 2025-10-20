/* agent-frontmatter:start
AGENT: Agent runtime entrypoint
PURPOSE: Expose the oRPC handler and server-side API for Agent Start
USAGE: const runtime = agentStart({ agent, memory })
EXPORTS: agentStart
FEATURES:
  - Creates a fetch-compatible RPC handler
  - Binds request-specific context for router execution
  - Provides a server-side API client via getApi
SEARCHABLE: agent runtime, orpc handler, server api
agent-frontmatter:end */

import { RPCHandler } from "@orpc/server/fetch";
import type { Context, CreateContextOptions } from "@/api";
import { appRouter, createContext } from "@/api";
import { getApi } from "@/api/get-api";
import type { AgentStartOptions } from "@/types";

export function agentStart(options: AgentStartOptions) {
  const context = { current: null as Context | null };

  const api = getApi(context);
  const rpcHandler = new RPCHandler(appRouter);

  return {
    handler: async (request: Request) => {
      const basePath = options.basePath ?? ("/api/agent" as const);

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
    api,

    get $$context() {
      return context.current;
    },
  };
}

export type AgentStart = ReturnType<typeof agentStart>;
