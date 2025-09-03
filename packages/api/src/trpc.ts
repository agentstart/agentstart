// AGENT: tRPC initialization and configuration
// PURPOSE: Sets up tRPC with SuperJSON transformer for type-safe API calls
// USAGE: Import router/procedure helpers from this file
// EXPORTS: createTRPCRouter, baseProcedure, createCallerFactory, publicProcedure, protectedProcedure
// SEARCHABLE: trpc setup, api initialization, type-safe api

import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import type { betterAuth } from "better-auth";
import type { Session } from "@acme/auth";

// AGENT: Context type for tRPC procedures
export interface Context {
  session: Session | null;
  headers?: Headers;
  auth?: ReturnType<typeof betterAuth>;
}

// AGENT: Create tRPC context
// USAGE: Called by API route handlers
// RETURNS: Context object available in all procedures
export const createTRPCContext = (opts: Context): Context => {
  return {
    session: opts.session ?? null,
    headers: opts.headers,
    auth: opts.auth,
  };
};

// Initialize tRPC with context and transformer
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: SuperJSON,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// Public procedure - no auth required
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});
