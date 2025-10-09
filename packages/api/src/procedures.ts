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

import { os } from "@orpc/server";
import type { Context } from "./context";

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = os.$context<Context>();
