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
const caller = createCallerFactory(appRouter)(async () =>
  createTRPCContext({
    headers: await headers(),
    auth: auth,
  }),
);
export const { trpc, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
