import process from "node:process";
import { logger } from "@agent-stack/utils";
import { createClient } from "redis";

export function createKV() {
  const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  client.on("error", (err) => logger.error("KV Client Error", err));
  client.connect();

  process.on("exit", () => {
    client.destroy();
    logger.info("KV Client disconnected due to process exit");
  });

  return client;
}

export type KV = ReturnType<typeof createKV>;
