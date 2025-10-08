/* agent-frontmatter:start
AGENT: oRPC procedure definitions with middleware
PURPOSE: Define base procedures with auth middleware
USAGE: Import and use for creating type-safe API endpoints
FEATURES:
  - Public procedure for unauthenticated requests
  - Protected procedure with auth check
  - Context type inference
  - Error handling
SEARCHABLE: orpc procedures, middleware, auth middleware
agent-frontmatter:end */

import { os, ORPCError } from "@orpc/server";
import type { Context } from "./context";

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = os.$context<Context>();

/**
 * Protected procedure - requires authentication
 * Throws if user is not authenticated
 */
export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "You must be logged in to perform this action",
    });
  }

  // Return the context with guaranteed user
  return next({
    context: {
      ...context,
      session: context.session,
      user: context.session.user,
    },
  });
});
