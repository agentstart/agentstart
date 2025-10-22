/* agent-frontmatter:start
AGENT: Playground API handler
PURPOSE: Wires the AgentStart handler into a Next.js App Router route.
USAGE: Deployed under /api/agent to forward HTTP requests to the agent runtime.
EXPORTS: None
FEATURES:
  - Exposes GET and POST handlers powered by AgentStart integration
  - Bridges Next.js routing with the configured agent pipeline
SEARCHABLE: playground, next, src, app, api, agent, [, all], route
agent-frontmatter:end */

import { toNextJsHandler } from "agentstart/integration";
import { start } from "@/lib/agent"; // path to your auth file

export const { POST, GET } = toNextJsHandler(start.handler);
