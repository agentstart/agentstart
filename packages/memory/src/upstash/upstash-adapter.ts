/* agent-frontmatter:start
AGENT: Upstash Redis adapter for SecondaryMemory
PURPOSE: Implements SecondaryMemoryAdapter using Upstash Redis SDK
USAGE: Import upstashSecondaryMemoryAdapter and pass configuration
EXPORTS: upstashSecondaryMemoryAdapter, SecondaryUpstashAdapterConfig
FEATURES:
  - Production-ready Upstash Redis integration via @upstash/redis SDK
  - TTL support via native Redis commands
  - Edge-compatible via REST API
  - Type-safe configuration
SEARCHABLE: upstash, redis, adapter, secondary memory, edge, serverless
agent-frontmatter:end */

import type { SecondaryMemoryAdapter } from "@agentstart/types";
import { Redis, type RedisConfigNodejs } from "@upstash/redis";

export interface SecondaryUpstashAdapterConfig extends RedisConfigNodejs {
  /**
   * Optional existing Upstash Redis client
   * If provided, other config options will be ignored
   */
  client?: Redis;
}

/**
 * Creates a SecondaryMemoryAdapter backed by Upstash Redis
 *
 * @example
 * ```typescript
 * import { upstashSecondaryMemoryAdapter } from 'agentstart/memory';
 *
 * // Using URL and token
 * const secondaryMemory = upstashSecondaryMemoryAdapter({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 *
 * // Using existing client
 * import { Redis } from '@upstash/redis';
 * const client = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 * const secondaryMemory = upstashSecondaryMemoryAdapter({ client });
 * ```
 */
export function upstashSecondaryMemoryAdapter(
  config: SecondaryUpstashAdapterConfig,
): SecondaryMemoryAdapter {
  const { client: existingClient, ...redisConfig } = config;
  const client = existingClient || new Redis(redisConfig);

  return {
    async get(key: string): Promise<string | null> {
      return await client.get<string>(key);
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      if (ttl) {
        await client.setex(key, ttl, value);
      } else {
        await client.set(key, value);
      }
    },

    async delete(key: string): Promise<void> {
      await client.del(key);
    },
  };
}
