/* agent-frontmatter:start
AGENT: Custom adapter factory for SecondaryMemory
PURPOSE: Allows users to create custom SecondaryMemoryAdapter implementations
USAGE: Import customSecondaryMemoryAdapter and provide implementation
EXPORTS: customSecondaryMemoryAdapter
FEATURES:
  - Type-safe custom adapter creation
  - Flexible implementation
  - Allows any storage backend
  - Perfect for custom requirements
SEARCHABLE: custom, adapter, secondary memory, user-defined, flexible
agent-frontmatter:end */

import type { SecondaryMemoryAdapter } from "@agentstart/types";

/**
 * Creates a custom SecondaryMemoryAdapter from user-provided implementation
 *
 * This factory function allows you to create a SecondaryMemoryAdapter with
 * any custom storage backend or logic you need.
 *
 * @example
 * ```typescript
 * import { customSecondaryMemoryAdapter } from 'agentstart/memory';
 *
 * // Using a custom database client
 * const secondaryMemory = customSecondaryMemoryAdapter({
 *   async get(key: string) {
 *     const result = await db.query('SELECT value FROM kv WHERE key = $1', [key]);
 *     return result.rows[0]?.value ?? null;
 *   },
 *   async set(key: string, value: string, ttl?: number) {
 *     if (ttl) {
 *       await db.query(
 *         'INSERT INTO kv (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3',
 *         [key, value, new Date(Date.now() + ttl * 1000)]
 *       );
 *     } else {
 *       await db.query(
 *         'INSERT INTO kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
 *         [key, value]
 *       );
 *     }
 *   },
 *   async delete(key: string) {
 *     await db.query('DELETE FROM kv WHERE key = $1', [key]);
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * import { customSecondaryMemoryAdapter } from 'agentstart/memory';
 * import { Redis as CloudflareRedis } from '@upstash/redis/cloudflare';
 *
 * // Using Cloudflare Workers with Upstash
 * const redis = new CloudflareRedis({
 *   url: env.UPSTASH_REDIS_REST_URL,
 *   token: env.UPSTASH_REDIS_REST_TOKEN,
 * });
 *
 * const secondaryMemory = customSecondaryMemoryAdapter({
 *   async get(key: string) {
 *     return await redis.get(key);
 *   },
 *   async set(key: string, value: string, ttl?: number) {
 *     if (ttl) {
 *       await redis.setex(key, ttl, value);
 *     } else {
 *       await redis.set(key, value);
 *     }
 *   },
 *   async delete(key: string) {
 *     await redis.del(key);
 *   },
 * });
 * ```
 */
export function customSecondaryMemoryAdapter(
  implementation: SecondaryMemoryAdapter,
): SecondaryMemoryAdapter {
  return implementation;
}
