/* agent-frontmatter:start
AGENT: Vercel Blob adapter factory
PURPOSE: Create BlobAdapterFactory for Vercel Blob storage
USAGE: blob: vercelBlobAdapter({ token, ... })
EXPORTS: vercelBlobAdapter
FEATURES:
  - Returns factory function compatible with AgentStartOptions
  - Wraps createVercelBlobAdapter with cleaner config interface
  - Supports all Vercel Blob configuration options
SEARCHABLE: vercel blob adapter factory, blob storage
agent-frontmatter:end */

import type {
  AgentStartOptions,
  BlobAdapter,
  BlobAdapterFactory,
  BlobConstraints,
} from "@agentstart/types";
import { createVercelBlobAdapter } from "../providers/vercel-blob";

export interface VercelBlobConfig {
  /**
   * Token used to authenticate with the Vercel Blob API (`BLOB_READ_WRITE_TOKEN`).
   */
  token: string;
  /**
   * Access level assigned to blobs.
   */
  access?: "public";
  /**
   * Optional prefix applied to stored blob paths.
   */
  keyPrefix?: string;
  /**
   * Additional options forwarded to blob operations (e.g., disable random suffixes).
   */
  addRandomSuffix?: boolean;
  /**
   * Allow overwriting existing blobs by default.
   */
  allowOverwrite?: boolean;
  /**
   * Configure shared cache-control max age applied to blob storage unless overridden.
   */
  cacheControlMaxAge?: number;
  /**
   * Constraints enforced before blob requests are dispatched.
   */
  constraints?: BlobConstraints;
}

export function vercelBlobAdapter(
  config: VercelBlobConfig,
): BlobAdapterFactory {
  return (_options: AgentStartOptions): BlobAdapter => {
    return createVercelBlobAdapter(
      {
        constraints: config.constraints,
      },
      {
        provider: "vercelBlob",
        token: config.token,
        access: config.access,
        keyPrefix: config.keyPrefix,
        addRandomSuffix: config.addRandomSuffix,
        allowOverwrite: config.allowOverwrite,
        cacheControlMaxAge: config.cacheControlMaxAge,
      },
    );
  };
}
