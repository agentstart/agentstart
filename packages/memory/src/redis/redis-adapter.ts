/* agent-frontmatter:start
AGENT: Redis adapter for SecondaryMemory
PURPOSE: Implements SecondaryMemoryAdapter using Redis/ioredis
USAGE: Import redisSecondaryMemoryAdapter and pass Redis configuration
EXPORTS: redisSecondaryMemoryAdapter, SecondaryRedisAdapterConfig
FEATURES:
  - Production-ready Redis integration
  - TTL support via Redis SETEX command
  - Automatic connection management
  - Type-safe configuration
SEARCHABLE: redis, adapter, secondary memory, ioredis, cache
agent-frontmatter:end */

import type { SecondaryMemoryAdapter } from "@agentstart/types";
import type Redis from "ioredis";
import type { RedisOptions } from "ioredis";

type RedisModule = typeof import("ioredis");
type RedisConstructor = RedisModule["default"];

let redisModulePromise: Promise<RedisModule> | undefined;

async function loadRedisModule(): Promise<RedisModule> {
  if (!redisModulePromise) {
    redisModulePromise = import("ioredis");
  }
  return redisModulePromise;
}

async function createRedisClient(
  url: string | undefined,
  redisOptions: RedisOptions,
): Promise<Redis> {
  const redisModule = await loadRedisModule();
  const RedisCtor = (redisModule.default ??
    (redisModule as unknown as RedisConstructor)) as RedisConstructor;
  return url ? new RedisCtor(url) : new RedisCtor(redisOptions);
}

export interface SecondaryRedisAdapterConfig extends RedisOptions {
  /**
   * Redis connection URL (e.g., "redis://localhost:6379")
   * If provided, other connection options will be ignored
   */
  url?: string;
}

/**
 * Creates a SecondaryMemoryAdapter backed by Redis
 *
 * @example
 * ```typescript
 * import { redisSecondaryMemoryAdapter } from 'agentstart/memory';
 *
 * // Using URL
 * const secondaryMemory = redisSecondaryMemoryAdapter({
 *   url: process.env.REDIS_URL,
 * });
 *
 * // Using individual options
 * const secondaryMemory = redisSecondaryMemoryAdapter({
 *   host: 'localhost',
 *   port: 6379,
 *   password: process.env.REDIS_PASSWORD,
 * });
 * ```
 */
export function redisSecondaryMemoryAdapter(
  config: SecondaryRedisAdapterConfig,
): SecondaryMemoryAdapter {
  const { url, ...redisOptions } = config;

  let clientPromise: Promise<Redis> | undefined;
  const getClient = async () => {
    if (!clientPromise) {
      clientPromise = createRedisClient(url, redisOptions);
    }
    return clientPromise;
  };

  return {
    async get(key: string): Promise<string | null> {
      const client = await getClient();
      return await client.get(key);
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      const client = await getClient();
      if (ttl) {
        await client.setex(key, ttl, value);
      } else {
        await client.set(key, value);
      }
    },

    async delete(key: string): Promise<void> {
      const client = await getClient();
      await client.del(key);
    },
  };
}
