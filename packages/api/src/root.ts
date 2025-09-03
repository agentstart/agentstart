// AGENT: Root tRPC router configuration
// PURPOSE: Combine all sub-routers into the main app router
// USAGE: Used by tRPC server and client initialization
// ROUTERS:
//   - auth: Authentication related procedures
//   - post: Post/content management procedures
// CUSTOMIZATION: Add new routers here as needed
// SEARCHABLE: root router, main router, trpc router

import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

// AGENT: Main application router
// ADD NEW ROUTERS: Import and add to this object
export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
