import process from "node:process";
import { logger } from "@agentstart/utils";
import { createClient, type RedisClientType } from "redis";

export function createKV(): RedisClientType {
  const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  client.on("error", (err) => logger.error("KV Client Error", err));
  client.connect();

  process.on("exit", () => {
    client.destroy();
    logger.info("KV Client disconnected due to process exit");
  });

  return client as RedisClientType;
}

export type KV = RedisClientType;
