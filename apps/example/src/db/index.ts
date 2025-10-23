/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Playground tool execution within the AgentStart runtime.
USAGE: Register the "playground" tool when composing the agent configuration to expose this capability.
EXPORTS: db
FEATURES:
  - Bridges sandbox APIs into the Playground workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: playground, next, src, db, index, tool, agent, runtime
agent-frontmatter:end */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql });

// Mongo
// import { MongoClient } from "mongodb";

// if (!process.env.DATABASE_URL) {
//   throw new Error("Missing DATABASE_URL");
// }
// const mongo = new MongoClient(process.env.DATABASE_URL!);
// export const db = mongo.db("agentstart");
