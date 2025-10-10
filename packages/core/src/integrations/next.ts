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

import { appRouter, createContext } from "@agent-stack/api";
import { RPCHandler } from "@orpc/server/fetch";
import type { CreateAgentOptions } from "../create";

export function toNextJsHandler(options: CreateAgentOptions) {
  const handler = new RPCHandler(appRouter);

  const basePath = options.basePath ?? ("/api/agent" as const);

  const handleRequest = async (request: Request) => {
    const context = createContext({
      headers: new Headers(request.headers),
      instance: options.instance,
      memory: options.instance.memory,
    });

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
