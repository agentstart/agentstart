/* agent-frontmatter:start
AGENT: Main oRPC router
PURPOSE: Combine all API procedures into a single router
USAGE: Import this router in Next.js route handlers
FEATURES:
  - Unified API router with all procedures
  - OpenAPI metadata support
  - Type-safe exports
  - Modular route organization
  - Dynamic middleware support
SEARCHABLE: orpc router, main router, api router
agent-frontmatter:end */

import type { AnyMiddleware } from "@orpc/server";
import { createProcedureBuilder } from "./procedures";
import { createBlobRouter } from "./routers/blob";
import { createMessageRouter } from "./routers/message";
import { createSandboxRouter } from "./routers/sandbox";
import { createThreadRouter } from "./routers/thread";

/**
 * Main API router combining all procedures
 * Each procedure can be accessed via RPC or REST
 */
export const appRouter = {
  thread: createThreadRouter(),
  message: createMessageRouter(),
  blob: createBlobRouter(),
  sandbox: createSandboxRouter(),
};

/**
 * Create app router with optional middleware applied
 */
export function createAppRouter(middleware?: AnyMiddleware[]) {
  if (!middleware?.length) {
    return appRouter;
  }

  // Create procedure builder with middleware
  const procedureBuilder = createProcedureBuilder(middleware);

  // Create routers with middleware-enhanced procedures
  return {
    thread: createThreadRouter(procedureBuilder),
    message: createMessageRouter(procedureBuilder),
    blob: createBlobRouter(procedureBuilder),
    sandbox: createSandboxRouter(procedureBuilder),
  };
}

// Export the router type for client usage
export type AppRouter = typeof appRouter;
