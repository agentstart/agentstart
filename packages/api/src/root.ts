// AGENT: Main tRPC router combining all sub-routers
// PURPOSE: Central router that aggregates all API routes
// USAGE: import { appRouter } from '@acme/api'
// SEARCHABLE: main router, api routes, trpc router

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./router/auth";
import { devRouter } from "./router/dev";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  dev: devRouter,
});

export type AppRouter = typeof appRouter;
