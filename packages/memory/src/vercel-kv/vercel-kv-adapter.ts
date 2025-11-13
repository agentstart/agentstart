/* agent-frontmatter:start
AGENT: Vercel KV adapter for SecondaryMemory
PURPOSE: Implements SecondaryMemoryAdapter using Vercel KV SDK
USAGE: Import vercelKVSecondaryMemoryAdapter and pass configuration
EXPORTS: vercelKVSecondaryMemoryAdapter, SecondaryVercelKVAdapterConfig
FEATURES:
  - Production-ready Vercel KV integration via @vercel/kv SDK
  - TTL support via native Redis commands
  - Edge-compatible
  - Type-safe configuration
SEARCHABLE: vercel kv, adapter, secondary memory, edge, serverless
agent-frontmatter:end */

import type { SecondaryMemoryAdapter } from "@agentstart/types";
import { createClient, type VercelKV } from "@vercel/kv";

export interface SecondaryVercelKVAdapterConfig {
  /**
   * Vercel KV REST API URL
   */
  url: string;
  /**
   * Vercel KV REST API Token
   */
  token: string;
  /**
   * Optional existing Vercel KV client
   * If provided, url and token will be ignored
   */
  client?: VercelKV;
}

/**
 * Creates a SecondaryMemoryAdapter backed by Vercel KV
 *
 * @example
 * ```typescript
 * import { vercelKVSecondaryMemoryAdapter } from 'agentstart/memory';
 *
 * // Using URL and token
 * const secondaryMemory = vercelKVSecondaryMemoryAdapter({
 *   url: process.env.KV_REST_API_URL!,
 *   token: process.env.KV_REST_API_TOKEN!,
 * });
 *
 * // Using existing client
 * import { createClient } from '@vercel/kv';
 * const client = createClient({
 *   url: process.env.KV_REST_API_URL!,
 *   token: process.env.KV_REST_API_TOKEN!,
 * });
 * const secondaryMemory = vercelKVSecondaryMemoryAdapter({ client });
 * ```
 */
export function vercelKVSecondaryMemoryAdapter(
  config: SecondaryVercelKVAdapterConfig,
): SecondaryMemoryAdapter {
  const client =
    config.client || createClient({ url: config.url, token: config.token });

  return {
    async get(key: string): Promise<string | null> {
      return await client.get<string>(key);
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      if (ttl) {
        await client.set(key, value, { ex: ttl });
      } else {
        await client.set(key, value);
      }
    },

    async delete(key: string): Promise<void> {
      await client.del(key);
    },
  };
}
