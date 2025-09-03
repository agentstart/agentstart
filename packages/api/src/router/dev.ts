// AGENT: Development tools tRPC router
// PURPOSE: Provides API endpoints for dev page demonstrating DB and TanStack Query usage
// USAGE: Used by /dev page for CRUD operations and query demonstrations
// FEATURES:
//   - User CRUD operations
//   - Pagination and filtering
//   - Batch operations
//   - Aggregations and statistics
// SEARCHABLE: dev router, demo api, crud operations, database examples

import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@acme/db/client";
import { users, sessions, accounts } from "@acme/db/schema";
import { eq, desc, asc, like, and, sql } from "drizzle-orm";

// Input schemas
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  image: z.string().url().optional(),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
});

const listUsersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  verified: z.enum(["all", "verified", "unverified"]).default("all"),
  sortBy: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const devRouter = createTRPCRouter({
  // Get all users with pagination and filtering
  listUsers: publicProcedure.input(listUsersSchema).query(async ({ input }) => {
    const { page, limit, search, verified, sortBy, sortOrder } = input;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`,
      );
    }
    if (verified === "verified") {
      conditions.push(eq(users.emailVerified, true));
    } else if (verified === "unverified") {
      conditions.push(eq(users.emailVerified, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get users with pagination
    const [data, totalCount] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(
          sortOrder === "asc"
            ? sortBy === "name"
              ? asc(users.name)
              : sortBy === "email"
                ? asc(users.email)
                : asc(users.createdAt)
            : sortBy === "name"
              ? desc(users.name)
              : sortBy === "email"
                ? desc(users.email)
                : desc(users.createdAt),
        )
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause)
        .then((res) => res[0]?.count ?? 0),
    ]);

    return {
      users: data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }),

  // Create new user
  createUser: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1)
        .then((res) => res[0]);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const [newUser] = await db
        .insert(users)
        .values({
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: input.name,
          email: input.email,
          image: input.image,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return newUser;
    }),

  // Update user
  updateUser: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      // Check if user exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
        .then((res) => res[0]);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check email uniqueness if updating email
      if (updates.email) {
        const emailExists = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, updates.email), sql`${users.id} != ${id}`))
          .limit(1)
          .then((res) => res[0]);

        if (emailExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    }),

  // Delete user
  deleteUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Delete related sessions and accounts first
      await db.delete(sessions).where(eq(sessions.userId, input.id));
      await db.delete(accounts).where(eq(accounts.userId, input.id));

      // Delete user
      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, input.id))
        .returning();

      if (!deletedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return deletedUser;
    }),

  // Batch delete users
  deleteUsers: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      // Delete related data in transaction
      const deletedUsers = await db.transaction(async (tx) => {
        // Delete sessions
        await tx.delete(sessions).where(
          sql`${sessions.userId} IN (${sql.join(
            input.ids.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );

        // Delete accounts
        await tx.delete(accounts).where(
          sql`${accounts.userId} IN (${sql.join(
            input.ids.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );

        // Delete users
        const deleted = await tx
          .delete(users)
          .where(
            sql`${users.id} IN (${sql.join(
              input.ids.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          )
          .returning();

        return deleted;
      });

      return {
        deleted: deletedUsers.length,
        ids: deletedUsers.map((u) => u.id),
      };
    }),

  // Get statistics
  getStats: publicProcedure.query(async () => {
    const [stats] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        totalPremium: sql<number>`count(*) filter (where ${users.stripeCustomerId} is not null)::int`,
        totalVerified: sql<number>`count(*) filter (where ${users.emailVerified} = true)::int`,
        lastWeekUsers: sql<number>`count(*) filter (where ${users.createdAt} > current_date - interval '7 days')::int`,
      })
      .from(users);

    return stats;
  }),

  // Seed demo data
  seedDemoData: protectedProcedure
    .input(z.object({ count: z.number().min(1).max(100).default(20) }))
    .mutation(async ({ input }) => {
      const demoUsers = Array.from({ length: input.count }, (_, i) => ({
        id: `demo_user_${Date.now()}_${i}`,
        name: `Demo User ${i + 1}`,
        email: `demo${i + 1}@example.com`,
        emailVerified: Math.random() > 0.5,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        stripeCustomerId: Math.random() > 0.7 ? `cus_demo_${i}` : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const inserted = await db
        .insert(users)
        .values(demoUsers)
        .onConflictDoNothing()
        .returning();

      return {
        created: inserted.length,
        message: `Created ${inserted.length} demo users`,
      };
    }),

  // Clear all demo data
  clearDemoData: protectedProcedure.mutation(async () => {
    // Only delete users with demo emails
    const deleted = await db
      .delete(users)
      .where(like(users.email, "demo%@example.com"))
      .returning();

    return {
      deleted: deleted.length,
      message: `Deleted ${deleted.length} demo users`,
    };
  }),
});
