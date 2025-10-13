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
// export const db = mongo.db("agent-stack");
