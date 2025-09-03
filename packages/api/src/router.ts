// AGENT: Main oRPC router
// PURPOSE: Combine all API procedures into a single router
// USAGE: Import this router in Next.js route handlers
// FEATURES:
//   - Unified API router with all procedures
//   - OpenAPI metadata support
//   - Type-safe exports
//   - Modular route organization
// SEARCHABLE: orpc router, main router, api router

import { devRouter } from "./routers/dev";
import { chatRouter } from "./routers/chat";

/**
 * Main API router combining all procedures
 * Each procedure can be accessed via RPC or REST
 */
export const appRouter = {
  chat: chatRouter,
  dev: devRouter,
};

// Export the router type for client usage
export type AppRouter = typeof appRouter;
