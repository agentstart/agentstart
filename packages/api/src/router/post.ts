// AGENT: Post management tRPC router
// PURPOSE: CRUD operations for posts/content
// PROCEDURES:
//   - all: Get all posts (public)
//   - byId: Get post by ID (public)
//   - create: Create new post (protected)
//   - delete: Delete post (protected)
// USAGE: trpc.post.all.useQuery()
// SEARCHABLE: post router, content api, crud operations

import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@acme/db";
import { CreatePostSchema, Post } from "@acme/db/schema";

import { protectedProcedure, publicProcedure } from "../trpc";

// AGENT: Post CRUD operations
// CUSTOMIZATION: Add more procedures as needed
export const postRouter = {
  all: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.Post.findMany({
      orderBy: desc(Post.id),
      limit: 10,
    });
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.Post.findFirst({
        where: eq(Post.id, input.id),
      });
    }),

  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.insert(Post).values(input);
    }),

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.db.delete(Post).where(eq(Post.id, input));
  }),
} satisfies TRPCRouterRecord;
