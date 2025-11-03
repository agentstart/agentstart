/* agent-frontmatter:start
AGENT: In-memory adapter for SecondaryMemory
PURPOSE: Implements SecondaryMemoryAdapter using in-process Map storage
USAGE: Import inMemorySecondaryMemoryAdapter for development/testing environments
EXPORTS: inMemorySecondaryMemoryAdapter
FEATURES:
  - Zero-dependency in-memory storage
  - TTL support via setTimeout
  - Perfect for development and testing
  - NOT suitable for production (data loss on restart)
SEARCHABLE: memory, adapter, secondary memory, in-memory, dev, test
agent-frontmatter:end */

import type { SecondaryMemoryAdapter } from "@agentstart/types";

interface StoredValue {
  value: string;
  expiresAt: number | null;
}

/**
 * Creates a SecondaryMemoryAdapter backed by in-memory storage
 *
 * **WARNING**: This adapter stores data in process memory.
 * Data will be lost on process restart. Only use for development/testing.
 *
 * @example
 * ```typescript
 * import { inMemorySecondaryMemoryAdapter } from 'agentstart/memory';
 *
 * const secondaryMemory = inMemorySecondaryMemoryAdapter();
 *
 * await secondaryMemory.set('key', 'value', 60); // expires in 60 seconds
 * const value = await secondaryMemory.get('key');
 * ```
 */
export function inMemorySecondaryMemoryAdapter(): SecondaryMemoryAdapter {
  const store = new Map<string, StoredValue>();
  const timers = new Map<string, NodeJS.Timeout>();

  // Cleanup expired entries
  const cleanup = (key: string) => {
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }
    store.delete(key);
  };

  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        cleanup(key);
        return null;
      }

      return entry.value;
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      // Clear existing timer if any
      const existingTimer = timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
        timers.delete(key);
      }

      const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
      store.set(key, { value, expiresAt });

      // Set cleanup timer if TTL provided
      if (ttl) {
        const timer = setTimeout(() => cleanup(key), ttl * 1000);
        timers.set(key, timer);
      }
    },

    async delete(key: string): Promise<void> {
      cleanup(key);
    },
  };
}
