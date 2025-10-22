/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Packages tool execution within the AgentStart runtime.
USAGE: Register the "packages" tool when composing the agent configuration to expose this capability.
EXPORTS: createKV, KV
FEATURES:
  - Bridges sandbox APIs into the Packages workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, kv, index, tool, agent, runtime
agent-frontmatter:end */

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
