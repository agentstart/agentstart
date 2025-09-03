// AGENT: React Query client configuration for tRPC
// PURPOSE: Configure React Query with SSR support and SuperJSON serialization
// USAGE: Used internally by tRPC client and server
// FEATURES:
//   - 30 second stale time for SSR optimization
//   - SuperJSON serialization for complex data types
//   - Proper error handling for Next.js
// SEARCHABLE: query client, react query config, tanstack query

import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

// AGENT: Create configured QueryClient instance
// CUSTOMIZATION: Adjust staleTime for different caching behavior
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => {
          // We should not catch Next.js server errors
          // as that's how Next.js detects dynamic pages
          // so we cannot redact them.
          // Next.js also automatically redacts errors for us
          // with better digests.
          return false;
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
