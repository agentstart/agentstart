/* agent-frontmatter:start
AGENT: oRPC base procedure utilities
PURPOSE: Provide shared context helpers for agent API routers
USAGE: Import { publicProcedure } for building type-safe endpoints
EXPORTS: publicProcedure, createProcedureBuilder
FEATURES:
  - Binds the Agent context into oRPC procedures
  - Establishes a common request typing surface
  - Supports dynamic middleware injection via context
SEARCHABLE: orpc procedures, agent context, rpc utilities
agent-frontmatter:end */

import type { AnyMiddleware } from "@orpc/server";
import { os } from "@orpc/server";
import type { Context } from "./context";

/**
 * Create a procedure builder with optional middleware
 */
export function createProcedureBuilder(middleware?: AnyMiddleware[]) {
  let procedure = os.$context<Context>().errors({
    UNAUTHORIZED: {},
    UNKNOWN: {},
    INTERNAL_SERVER_ERROR: {},
    NOT_FOUND: {},
    FORBIDDEN: {},
  });

  // Apply middleware if provided
  if (middleware?.length) {
    for (const mw of middleware) {
      procedure = (procedure as any).use(mw);
    }
  }

  return procedure;
}

/**
 * Public procedure - no authentication required
 * Default procedure without middleware
 */
export const publicProcedure = createProcedureBuilder();
