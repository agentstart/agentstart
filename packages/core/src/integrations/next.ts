import { appRouter, createContext } from "@agent-stack/api";
import { RPCHandler } from "@orpc/server/fetch";
import type { CreateAgentOptions } from "../create";

export function toNextJsHandler(options: CreateAgentOptions) {
  const handler = new RPCHandler(appRouter);

  const basePath = options.basePath ?? ("/api/agent" as const);

  const handleRequest = async (request: Request) => {
    const context = await createContext({
      headers: new Headers(request.headers),
      instance: options.instance,
      memory: options.memory,
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
