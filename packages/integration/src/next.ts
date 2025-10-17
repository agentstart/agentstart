/* agent-frontmatter:start
AGENT: Next.js integration
PURPOSE: Adapt the Agent router to Next.js App Router handlers
USAGE: export const route = toNextJsHandler({ instance, memory })
EXPORTS: toNextJsHandler
FEATURES:
  - Wraps oRPC router with Next.js compatible request handlers
  - Injects Agent context per request
  - Supports custom base paths
SEARCHABLE: next.js handler, agent integration, rpc handler
agent-frontmatter:end */

import type { CreateContextOptions } from "@agent-stack/api";
import { appRouter, createContext } from "@agent-stack/api";
import type { AgentStackOptions } from "@agent-stack/types";
import { RPCHandler } from "@orpc/server/fetch";

export function toNextJsHandler(options: AgentStackOptions) {
  const handler = new RPCHandler(appRouter);

  const basePath = options.basePath ?? ("/api/agent" as const);

  const handleRequest = async (request: Request) => {
    const contextOptions: CreateContextOptions = {
      headers: new Headers(request.headers),
      ...options,
    };

    const context = createContext(contextOptions);

    const { response } = await handler.handle(request, {
      prefix: basePath,
      context,
    });

    return response ?? new Response("Not found", { status: 404 });
  };

  return {
    HEAD: handleRequest,
    GET: handleRequest,
    POST: handleRequest,
    PUT: handleRequest,
    PATCH: handleRequest,
    DELETE: handleRequest,
  };
}
