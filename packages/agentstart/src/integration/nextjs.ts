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

export function toNextJsHandler(
  handler:
    | {
        handler: (request: Request) => Promise<Response>;
      }
    | ((request: Request) => Promise<Response>),
) {
  const handleRequest = async (request: Request) => {
    return "handler" in handler ? handler.handler(request) : handler(request);
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
