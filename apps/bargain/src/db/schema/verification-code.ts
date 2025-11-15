/* agent-frontmatter:start
AGENT: Verification code schema
PURPOSE: Define database schema for verification codes used in purchase verification
USAGE: Import verificationCode table definition for database operations
EXPORTS: verificationCode
FEATURES:
  - Stores 5-digit verification codes
  - Links codes to thread/conversation
  - Tracks redemption status
  - Stores original negotiated price
SEARCHABLE: verification code, schema, database, table, redeem, purchase
agent-frontmatter:end */

import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { thread } from "./agent";

export const verificationCode = pgTable("verification_code", {
  id: text("id").primaryKey(),
  code: text("code").notNull(), // 5-digit verification code
  threadId: text("thread_id")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  price: numeric("price").notNull(), // Original price from the bargain
  isRedeemed: boolean("is_redeemed").notNull().default(false), // Whether the code has been used
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
