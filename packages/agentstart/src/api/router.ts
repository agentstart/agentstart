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
  - Conditional router loading based on configuration
SEARCHABLE: orpc router, main router, api router
agent-frontmatter:end */

import type { AnyMiddleware } from "@orpc/server";
import { createProcedureBuilder } from "./procedures";

/**
 * Options for creating the app router
 */
export interface CreateAppRouterOptions {
  middleware?: AnyMiddleware[];
  /**
   * Enable or disable specific routers
   */
  enabledRouters?: {
    thread?: boolean;
    message?: boolean;
    blob?: boolean;
    config?: boolean;
    sandbox?: boolean;
  };
}

/**
 * Create app router with optional middleware and router selection
 * Uses dynamic imports for conditional routers
 */
export async function createAppRouter(options?: CreateAppRouterOptions) {
  const middleware = options?.middleware;
  const enabledRouters = options?.enabledRouters ?? {};

  // Default all routers to enabled
  const enableThread = enabledRouters.thread ?? true;
  const enableMessage = enabledRouters.message ?? true;
  const enableBlob = enabledRouters.blob ?? true;
  const enableConfig = enabledRouters.config ?? true;
  const enableSandbox = enabledRouters.sandbox ?? true;

  // Create procedure builder with middleware if provided
  const procedureBuilder = middleware?.length
    ? createProcedureBuilder(middleware)
    : undefined;

  // Conditionally load each router based on configuration
  const routers: Partial<AppRouter> = {};

  if (enableThread) {
    const { createThreadRouter } = await import("./routers/thread");
    routers.thread = createThreadRouter(procedureBuilder);
  }

  if (enableMessage) {
    const { createMessageRouter } = await import("./routers/message");
    routers.message = createMessageRouter(procedureBuilder);
  }

  if (enableBlob) {
    const { createBlobRouter } = await import("./routers/blob");
    routers.blob = createBlobRouter(procedureBuilder);
  }

  if (enableConfig) {
    const { createConfigRouter } = await import("./routers/config");
    routers.config = createConfigRouter(procedureBuilder);
  }

  if (enableSandbox) {
    const { createSandboxRouter } = await import("./routers/sandbox");
    routers.sandbox = createSandboxRouter(procedureBuilder);
  }

  return routers as AppRouter;
}

/**
 * Type representing the full app router with all routes enabled
 * Used for type-safe API client creation
 */
export type AppRouter = {
  thread: ReturnType<typeof import("./routers/thread").createThreadRouter>;
  message: ReturnType<typeof import("./routers/message").createMessageRouter>;
  blob: ReturnType<typeof import("./routers/blob").createBlobRouter>;
  config: ReturnType<typeof import("./routers/config").createConfigRouter>;
  sandbox: ReturnType<typeof import("./routers/sandbox").createSandboxRouter>;
};
