/**
 * SecondaryMemoryAdapter provides a simple key-value storage interface
 * for long-lived artifacts like sandbox heartbeats.
 *
 * Implementations:
 * - Redis adapter: @agentstart/secondary-memory/redis
 * - In-memory adapter: @agentstart/secondary-memory/memory
 */
export interface SecondaryMemoryAdapter {
  /**
   * Retrieve a value by key
   * @param key - The key to retrieve
   * @returns The value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Store a value with optional TTL
   * @param key - The key to store
   * @param value - The value to store (must be a string)
   * @param ttl - Optional time-to-live in seconds
   */
  set(key: string, value: string, ttl?: number): Promise<void>;

  /**
   * Delete a value by key
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>;
}
