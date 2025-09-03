// AGENT: Development router using oRPC
// PURPOSE: CRUD operations for dev dashboard demonstrating DB usage
// USAGE: Used by /dev page for user management and testing
// FEATURES:
//   - User CRUD with pagination and filtering
//   - Batch operations
//   - Statistics and aggregations
//   - Demo data seeding
// SEARCHABLE: dev router, crud api, user management, demo data

import { z } from "zod/v4";
import { publicProcedure, protectedProcedure } from "../procedures";
import { users, sessions, accounts } from "@acme/db/schema";
import { eq, desc, asc, like, and, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

// User schemas
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  image: z.url().optional(),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
  image: z.url().optional().nullable(),
});

const listUsersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  verified: z.enum(["all", "verified", "unverified"]).default("all"),
  sortBy: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// List users with pagination and filtering
const listUsersProcedure = publicProcedure
  .input(listUsersSchema)
  .handler(async ({ input, context }) => {
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
      context.db
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
      context.db
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
  });

// Create user
const createUserProcedure = protectedProcedure
  .input(createUserSchema)
  .handler(async ({ input, context }) => {
    // Check if email already exists
    const existing = await context.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)
      .then((res) => res[0]);

    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "User with this email already exists",
      });
    }

    const [newUser] = await context.db
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
  });

// Update user
const updateUserProcedure = protectedProcedure
  .input(updateUserSchema)
  .handler(async ({ input, context }) => {
    const { id, ...updates } = input;

    // Check if user exists
    const existing = await context.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((res) => res[0]);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "User not found",
      });
    }

    // Check email uniqueness if updating email
    if (updates.email) {
      const emailExists = await context.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, updates.email), sql`${users.id} != ${id}`))
        .limit(1)
        .then((res) => res[0]);

      if (emailExists) {
        throw new ORPCError("CONFLICT", {
          message: "Email already in use",
        });
      }
    }

    const [updatedUser] = await context.db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  });

// Delete user
const deleteUserProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    // Delete related sessions and accounts first
    await context.db.delete(sessions).where(eq(sessions.userId, input.id));
    await context.db.delete(accounts).where(eq(accounts.userId, input.id));

    // Delete user
    const [deletedUser] = await context.db
      .delete(users)
      .where(eq(users.id, input.id))
      .returning();

    if (!deletedUser) {
      throw new ORPCError("NOT_FOUND", {
        message: "User not found",
      });
    }

    return deletedUser;
  });

// Batch delete users
const deleteUsersProcedure = protectedProcedure
  .input(z.object({ ids: z.array(z.string()).min(1) }))
  .handler(async ({ input, context }) => {
    // Delete related data in transaction
    const deletedUsers = await context.db.transaction(async (tx) => {
      // Delete sessions
      await tx.delete(sessions).where(
        sql`${sessions.userId} IN (${sql.join(
          input.ids.map((id: string) => sql`${id}`),
          sql`, `,
        )})`,
      );

      // Delete accounts
      await tx.delete(accounts).where(
        sql`${accounts.userId} IN (${sql.join(
          input.ids.map((id: string) => sql`${id}`),
          sql`, `,
        )})`,
      );

      // Delete users
      const deleted = await tx
        .delete(users)
        .where(
          sql`${users.id} IN (${sql.join(
            input.ids.map((id: string) => sql`${id}`),
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
  });

// Get statistics
const getStatsProcedure = publicProcedure.handler(async ({ context }) => {
  const [stats] = await context.db
    .select({
      totalUsers: sql<number>`count(*)::int`,
      totalPremium: sql<number>`count(*) filter (where ${users.stripeCustomerId} is not null)::int`,
      totalVerified: sql<number>`count(*) filter (where ${users.emailVerified} = true)::int`,
      lastWeekUsers: sql<number>`count(*) filter (where ${users.createdAt} > current_date - interval '7 days')::int`,
    })
    .from(users);

  return stats;
});

// Seed demo data
const seedDemoDataProcedure = protectedProcedure
  .input(z.object({ count: z.number().min(1).max(100).default(20) }))
  .handler(async ({ input, context }) => {
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

    const inserted = await context.db
      .insert(users)
      .values(demoUsers)
      .onConflictDoNothing()
      .returning();

    return {
      created: inserted.length,
      message: `Created ${inserted.length} demo users`,
    };
  });

// Clear demo data
const clearDemoDataProcedure = protectedProcedure.handler(
  async ({ context }) => {
    // Only delete users with demo emails
    const deleted = await context.db
      .delete(users)
      .where(like(users.email, "demo%@example.com"))
      .returning();

    return {
      deleted: deleted.length,
      message: `Deleted ${deleted.length} demo users`,
    };
  },
);

export const devRouter = {
  listUsers: listUsersProcedure,
  createUser: createUserProcedure,
  updateUser: updateUserProcedure,
  deleteUser: deleteUserProcedure,
  deleteUsers: deleteUsersProcedure,
  getStats: getStatsProcedure,
  seedDemoData: seedDemoDataProcedure,
  clearDemoData: clearDemoDataProcedure,
};
