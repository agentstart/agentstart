// AGENT: Feedback router using oRPC
// PURPOSE: Handle user feedback submission and retrieval
// USAGE: Submit and query user feedback entries
// FEATURES:
//   - Submit feedback with mood and topic
//   - Query feedback with filters
//   - Update feedback status (admin)
//   - Add response to feedback (admin)
// SEARCHABLE: feedback router, user feedback, feedback api

import { z } from "zod/v4";
import { publicProcedure, protectedProcedure } from "../procedures";
import { db } from "@acme/db/client";
import { feedback } from "@acme/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// AGENT: Input validation schemas
const submitFeedbackSchema = z.object({
  topic: z.enum(["bug", "feature", "improvement", "general"]),
  content: z.string().min(1).max(5000),
  mood: z.enum(["happy", "satisfied", "unsatisfied", "sad"]),
});

const listFeedbackSchema = z.object({
  status: z.enum(["pending", "reviewed", "resolved"]).optional(),
  topic: z.enum(["bug", "feature", "improvement", "general"]).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const updateFeedbackSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "reviewed", "resolved"]).optional(),
  response: z.string().max(5000).optional(),
});

export const feedbackRouter = {
  // AGENT: Submit feedback (public endpoint - allows anonymous feedback)
  submit: publicProcedure
    .input(submitFeedbackSchema)
    .handler(async ({ input, context }) => {
      const userId = context.user?.id || null;

      const [newFeedback] = await db
        .insert(feedback)
        .values({
          id: nanoid(),
          topic: input.topic,
          content: input.content,
          mood: input.mood,
          userId,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        feedback: newFeedback,
      };
    }),

  // AGENT: List feedback entries
  list: protectedProcedure
    .input(listFeedbackSchema)
    .handler(async ({ input }) => {
      const conditions = [];

      if (input.status) {
        conditions.push(eq(feedback.status, input.status));
      }

      if (input.topic) {
        conditions.push(eq(feedback.topic, input.topic));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalCount] = await Promise.all([
        db
          .select()
          .from(feedback)
          .where(where)
          .orderBy(desc(feedback.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(feedback)
          .where(where)
          .then((res) => res[0]?.count ?? 0),
      ]);

      return {
        items,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // AGENT: Get single feedback by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const result = await db
        .select()
        .from(feedback)
        .where(eq(feedback.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new Error("Feedback not found");
      }

      return result[0];
    }),

  // AGENT: Update feedback (admin only - for status and response)
  update: protectedProcedure
    .input(updateFeedbackSchema)
    .handler(async ({ input }) => {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.status) {
        updateData.status = input.status;
      }

      if (input.response !== undefined) {
        updateData.response = input.response;
      }

      const [updated] = await db
        .update(feedback)
        .set(updateData)
        .where(eq(feedback.id, input.id))
        .returning();

      if (!updated) {
        throw new Error("Feedback not found");
      }

      return {
        success: true,
        feedback: updated,
      };
    }),

  // AGENT: Get feedback statistics
  stats: protectedProcedure.handler(async () => {
    const [
      totalCount,
      pendingCount,
      reviewedCount,
      resolvedCount,
      moodStats,
      topicStats,
    ] = await Promise.all([
      // Total feedback count
      db
        .select({ count: sql<number>`count(*)` })
        .from(feedback)
        .then((res) => res[0]?.count ?? 0),

      // Pending count
      db
        .select({ count: sql<number>`count(*)` })
        .from(feedback)
        .where(eq(feedback.status, "pending"))
        .then((res) => res[0]?.count ?? 0),

      // Reviewed count
      db
        .select({ count: sql<number>`count(*)` })
        .from(feedback)
        .where(eq(feedback.status, "reviewed"))
        .then((res) => res[0]?.count ?? 0),

      // Resolved count
      db
        .select({ count: sql<number>`count(*)` })
        .from(feedback)
        .where(eq(feedback.status, "resolved"))
        .then((res) => res[0]?.count ?? 0),

      // Mood distribution
      db
        .select({
          mood: feedback.mood,
          count: sql<number>`count(*)`,
        })
        .from(feedback)
        .groupBy(feedback.mood),

      // Topic distribution
      db
        .select({
          topic: feedback.topic,
          count: sql<number>`count(*)`,
        })
        .from(feedback)
        .groupBy(feedback.topic),
    ]);

    return {
      total: totalCount,
      byStatus: {
        pending: pendingCount,
        reviewed: reviewedCount,
        resolved: resolvedCount,
      },
      byMood: moodStats.reduce(
        (acc, stat) => ({
          ...acc,
          [stat.mood]: stat.count,
        }),
        {},
      ),
      byTopic: topicStats.reduce(
        (acc, stat) => ({
          ...acc,
          [stat.topic]: stat.count,
        }),
        {},
      ),
    };
  }),
};
