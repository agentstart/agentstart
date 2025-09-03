// AGENT: Authentication tRPC router
// PURPOSE: Handle authentication-related API procedures
// PROCEDURES:
//   - getSession: Get current user session (public)
//   - getSecretMessage: Example protected endpoint
// USAGE: trpc.auth.getSession.useQuery()
// SEARCHABLE: auth router, authentication api, session api

import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = {
  // AGENT: Get current session without authentication requirement
  // USAGE: const { data: session } = trpc.auth.getSession.useQuery()
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  
  // AGENT: Example protected procedure - requires authentication
  // USAGE: const { data } = trpc.auth.getSecretMessage.useQuery()
  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
  }),
} satisfies TRPCRouterRecord;
