// AGENT: Server-side tRPC setup for React Server Components
// PURPOSE: Enables tRPC calls in server components with hydration
// USAGE:
//   - Direct calls: await trpc.example.hello()
//   - With hydration: <HydrateClient>...</HydrateClient>
// EXPORTS: trpc (server caller), HydrateClient (hydration wrapper)
// REQUIRES: Running in server environment (not browser)
// SEARCHABLE: server trpc, rsc api, server components api

import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { createHydrationHelpers } from "@trpc/react-query/rsc";

import type { AppRouter } from "@acme/api";
import { appRouter, createCallerFactory, createTRPCContext } from "@acme/api";

import { auth } from "@/lib/auth/server";
import { createQueryClient } from "./query-client";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(createQueryClient);
const caller = createCallerFactory(appRouter)(async () => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return createTRPCContext({
    headers: h,
    auth,
    session: session,
  });
});
export const { trpc, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
