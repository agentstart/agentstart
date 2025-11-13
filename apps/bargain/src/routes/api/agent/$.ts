/* agent-frontmatter:start
AGENT: Agent API route handler
PURPOSE: TanStack Start API route that handles agent requests
USAGE: Mounted under /api/agent/* to process agent interactions
EXPORTS: Route (file-based API route)
FEATURES:
  - Handles GET and POST requests for agent communication
  - Server-only execution context (server.handlers)
SEARCHABLE: api, agent, route, handler, tanstack start
agent-frontmatter:end */

import { createFileRoute } from "@tanstack/react-router";
import { start } from "@/lib/agent";

export const Route = createFileRoute("/api/agent/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await start.handler(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return await start.handler(request);
      },
    },
  },
});
