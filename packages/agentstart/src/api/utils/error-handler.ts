/* agent-frontmatter:start
AGENT: Router error handling utilities
PURPOSE: Provide shared error handling utilities for API routers
USAGE: import { handleRouterError } from "@/api/utils/error-handler"
EXPORTS: handleRouterError
FEATURES:
  - Consistent error handling across all routers
  - Re-throws errors with 'code' property
  - Wraps unknown errors in INTERNAL_SERVER_ERROR
SEARCHABLE: error handler, router utils, api error handling
agent-frontmatter:end */

/**
 * Handle errors consistently across all endpoints
 * Re-throws errors with 'code' property, wraps others in INTERNAL_SERVER_ERROR
 *
 * @param error - The error to handle
 * @param errors - Error constructors from oRPC
 * @throws The error with proper code and message
 */
export function handleRouterError(
  error: unknown,
  errors: { INTERNAL_SERVER_ERROR: (opts: { message: string }) => Error },
): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }
  throw errors.INTERNAL_SERVER_ERROR({
    message: error instanceof Error ? error.message : "Unknown error",
  });
}
