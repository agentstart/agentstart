/* agent-frontmatter:start
AGENT: Authentication database schema definitions
PURPOSE: Define tables for Better Auth authentication system
TABLES:
  - users: User accounts
  - sessions: Active user sessions
  - accounts: OAuth provider accounts
  - verifications: Email/phone verifications
  - subscriptions: Stripe subscriptions
USAGE: import { users, sessions } from '@agent-stack/db/schema'
SEARCHABLE: auth schema, user table, session table
agent-frontmatter:end */

import { pgTable } from "drizzle-orm/pg-core";

/* agent-frontmatter:start
AGENT: Users table schema
FIELDS: id, name, email, emailVerified, image, stripeCustomerId
RELATIONS: sessions, accounts, subscriptions
agent-frontmatter:end */
export const users = pgTable("users", (t) => ({
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  email: t.text().notNull().unique(),
  emailVerified: t.boolean().notNull(),
  image: t.text(),
  /**
   * The Stripe customer ID
   */
  stripeCustomerId: t.text(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
}));

export const sessions = pgTable("sessions", (t) => ({
  id: t.text().primaryKey(),
  expiresAt: t.timestamp().notNull(),
  token: t.text().notNull().unique(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
  ipAddress: t.text(),
  userAgent: t.text(),
  userId: t
    .text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
}));

export const accounts = pgTable("accounts", (t) => ({
  id: t.text().primaryKey(),
  accountId: t.text().notNull(),
  providerId: t.text().notNull(),
  userId: t
    .text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: t.text(),
  refreshToken: t.text(),
  idToken: t.text(),
  accessTokenExpiresAt: t.timestamp(),
  refreshTokenExpiresAt: t.timestamp(),
  scope: t.text(),
  password: t.text(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
}));

export const verifications = pgTable("verifications", (t) => ({
  id: t.text().primaryKey(),
  identifier: t.text().notNull(),
  value: t.text().notNull(),
  expiresAt: t.timestamp().notNull(),
  createdAt: t.timestamp(),
  updatedAt: t.timestamp(),
}));

export const subscriptions = pgTable("subscriptions", (t) => ({
  id: t.text().primaryKey(),
  /**
   * The name of the subscription plan
   */
  plan: t.text().notNull(),
  /**
   * The ID this subscription is associated with (user ID by default)
   */
  referenceId: t.text().notNull(),
  /**
   * The Stripe customer ID
   */
  stripeCustomerId: t.text(),
  /**
   * The Stripe subscription ID
   */
  stripeSubscriptionId: t.text(),
  /**
   * The status of the subscription (active, canceled, etc.)
   */
  status: t.text().notNull(),
  /**
   * Start date of the current billing period
   */
  periodStart: t.timestamp(),
  /**
   * End date of the current billing period
   */
  periodEnd: t.timestamp(),
  /**
   * Whether the subscription will be cancelled at the end of the period
   */
  cancelAtPeriodEnd: t.boolean(),
  /**
   * Number of seats for team plans
   */
  seats: t.integer(),
  /**
   * Start date of the trial period
   */
  trialStart: t.timestamp(),
  /**
   * End date of the trial period
   */
  trialEnd: t.timestamp(),
}));
