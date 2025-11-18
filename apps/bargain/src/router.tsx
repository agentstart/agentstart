/* agent-frontmatter:start
AGENT: Router factory
PURPOSE: Creates the TanStack router instance used across the bargain app.
USAGE: Call getRouter() in both server and client bootstrap paths.
EXPORTS: getRouter
FEATURES:
  - Provides consistent router configuration for SSR/CSR
  - Supplies a custom not-found component for unknown routes
SEARCHABLE: router, tanstack, bargain app, not found
agent-frontmatter:end */

import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter } from "@tanstack/react-router";
import { NotFound } from "@/components/not-found";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  });

  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.SENTRY_DSN,

      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
      sendDefaultPii: true,
    });
  }

  return router;
};
