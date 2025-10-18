/* agent-frontmatter:start
AGENT: oRPC base procedure utilities
PURPOSE: Provide shared context helpers for agent API routers
USAGE: Import { publicProcedure } for building type-safe endpoints
EXPORTS: publicProcedure
FEATURES:
  - Binds the Agent context into oRPC procedures
  - Establishes a common request typing surface
SEARCHABLE: orpc procedures, agent context, rpc utilities
agent-frontmatter:end */

import { os } from "@orpc/server";
import type { Context } from "./context";

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = os.$context<Context>().errors({
  UNAUTHORIZED: {},
  UNKNOWN: {},
  INTERNAL_SERVER_ERROR: {},
});
