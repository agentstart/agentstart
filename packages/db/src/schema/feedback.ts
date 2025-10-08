/* agent-frontmatter:start
AGENT: Feedback database schema definitions
PURPOSE: Define tables for user feedback system
TABLES:
  - feedback: User feedback entries
USAGE: import { feedback } from '@acme/db/schema'
SEARCHABLE: feedback schema, feedback table, user feedback
agent-frontmatter:end */

import { pgTable, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./auth";

/* agent-frontmatter:start
AGENT: Feedback mood enum
VALUES: happy, satisfied, unsatisfied, sad
agent-frontmatter:end */
export const feedbackMoodEnum = pgEnum("feedback_mood", [
  "happy",
  "satisfied",
  "unsatisfied",
  "sad",
]);

/* agent-frontmatter:start
AGENT: Feedback status enum
VALUES: pending, reviewed, resolved
agent-frontmatter:end */
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "reviewed",
  "resolved",
]);

/* agent-frontmatter:start
AGENT: Feedback topic enum
VALUES: bug, feature, improvement, general
agent-frontmatter:end */
export const feedbackTopicEnum = pgEnum("feedback_topic", [
  "bug",
  "feature",
  "improvement",
  "general",
]);

/* agent-frontmatter:start
AGENT: Feedback table schema
FIELDS: id, topic, content, mood, userId, status, response, createdAt, updatedAt
RELATIONS: users (optional, for authenticated feedback)
agent-frontmatter:end */
export const feedback = pgTable("feedback", (t) => ({
  id: t.text().primaryKey(),
  /**
   * The topic category of the feedback
   */
  topic: feedbackTopicEnum().notNull(),
  /**
   * The feedback content/message (supports markdown)
   */
  content: t.text().notNull(),
  /**
   * The user's mood/emotion when submitting feedback
   */
  mood: feedbackMoodEnum().notNull(),
  /**
   * Optional user ID if feedback is submitted by authenticated user
   */
  userId: t.text().references(() => users.id, { onDelete: "set null" }),
  /**
   * Current status of the feedback
   */
  status: feedbackStatusEnum().notNull().default("pending"),
  /**
   * Admin response to the feedback
   */
  response: t.text(),
  /**
   * When the feedback was created
   */
  createdAt: t.timestamp().notNull().defaultNow(),
  /**
   * When the feedback was last updated
   */
  updatedAt: t.timestamp().notNull().defaultNow(),
}));
