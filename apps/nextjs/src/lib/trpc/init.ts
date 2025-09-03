// AGENT: tRPC initialization and configuration
// PURPOSE: Sets up tRPC with SuperJSON transformer for type-safe API calls
// USAGE: Import router/procedure helpers from this file
// EXPORTS: createTRPCRouter, baseProcedure, createCallerFactory
// SEARCHABLE: trpc setup, api initialization, type-safe api

import { cache } from "react";
import { initTRPC } from "@trpc/server";
import SuperJSON from "superjson";

// AGENT: Create tRPC context with caching
// USAGE: Automatically called by tRPC, can add auth/db connections here
// RETURNS: Context object available in all procedures
export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return {};
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: SuperJSON,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
