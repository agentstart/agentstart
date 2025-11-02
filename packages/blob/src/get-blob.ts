/* agent-frontmatter:start
AGENT: Blob adapter resolver
PURPOSE: Resolve BlobAdapter instance from AgentStartOptions configuration
USAGE: const blob = await getBlob(options)
EXPORTS: getBlob
FEATURES:
  - Accepts BlobAdapter instance or BlobAdapterFactory
  - Returns null if no blob configuration is provided (blob is optional)
  - Caches initialized adapters for reuse
  - Type-safe adapter resolution
SEARCHABLE: blob resolver, getBlob, blob adapter initialization
agent-frontmatter:end */

import type { AgentStartOptions, BlobAdapter } from "@agentstart/types";

const blobCache = new WeakMap<
  (options: AgentStartOptions) => Promise<BlobAdapter> | BlobAdapter,
  Promise<BlobAdapter>
>();

export async function getBlob(
  options: AgentStartOptions,
): Promise<BlobAdapter | null> {
  if (!options.blob) {
    return null; // Blob is optional
  }

  // If already a BlobAdapter instance
  if (isBlobAdapter(options.blob)) {
    return options.blob;
  }

  // If it's a factory function
  const factory = options.blob;
  const cached = blobCache.get(factory);
  if (cached) {
    return cached;
  }

  const promise = Promise.resolve(factory(options));
  blobCache.set(factory, promise);

  try {
    return await promise;
  } catch (error) {
    blobCache.delete(factory);
    throw error;
  }
}

function isBlobAdapter(value: unknown): value is BlobAdapter {
  return (
    typeof value === "object" &&
    value !== null &&
    "provider" in value &&
    typeof (value as Record<string, unknown>).put === "function" &&
    typeof (value as Record<string, unknown>).del === "function"
  );
}
