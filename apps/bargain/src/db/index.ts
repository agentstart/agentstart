/* agent-frontmatter:start
AGENT: Playground memory bootstrap
PURPOSE: Configures the Drizzle connection used by the sample agent memory layer.
USAGE: Import to obtain the memory persistence client for the playground.
EXPORTS: db
FEATURES:
  - Provides a Neon-backed Drizzle client for persistence
  - Supplies optional MongoDB example for alternative storage
SEARCHABLE: playground, next, src, memory, drizzle, persistence, bootstrap
agent-frontmatter:end */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql, schema });

// Mongo
// import { MongoClient } from "mongodb";

// if (!process.env.DATABASE_URL) {
//   throw new Error("Missing DATABASE_URL");
// }
// const mongo = new MongoClient(process.env.DATABASE_URL!);
// export const db = mongo.db("agentstart");
