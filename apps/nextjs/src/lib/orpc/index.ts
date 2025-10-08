/* agent-frontmatter:start
AGENT: oRPC client configuration
PURPOSE: Configure oRPC client for browser usage
USAGE: Import orpc client for API calls in components
FEATURES:
  - Automatic type inference from server router
  - Support for client components
  - Authentication headers handling
  - Base URL configuration
SEARCHABLE: orpc client, api client, rpc client
agent-frontmatter:end */

"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouter } from "@acme/api";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

// Create the link
const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      return "http://localhost:3000/api";
    }
    return `${window.location.origin}/api`;
  },
});

// Create the client with proper typing
export const client: RouterClient<AppRouter> = createORPCClient(link);

// Create TanStack query utils
export const orpc = createTanstackQueryUtils(client);
