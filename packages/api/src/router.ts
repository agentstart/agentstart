/* agent-frontmatter:start
AGENT: Main oRPC router
PURPOSE: Combine all API procedures into a single router
USAGE: Import this router in Next.js route handlers
FEATURES:
  - Unified API router with all procedures
  - OpenAPI metadata support
  - Type-safe exports
  - Modular route organization
SEARCHABLE: orpc router, main router, api router
agent-frontmatter:end */

import { chatRouter } from "./routers/chat";
import { messageRouter } from "./routers/message";
import { projectRouter } from "./routers/project";

/**
 * Main API router combining all procedures
 * Each procedure can be accessed via RPC or REST
 */
export const appRouter = {
  chat: chatRouter,
  message: messageRouter,
  project: projectRouter,
};

// Export the router type for client usage
export type AppRouter = typeof appRouter;
