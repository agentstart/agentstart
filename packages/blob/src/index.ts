/* agent-frontmatter:start
AGENT: Blob storage package entry point
PURPOSE: Export all blob storage types, adapters, and utilities
USAGE: import { createBlobAdapter, type BlobOptions } from "@agentstart/blob"
EXPORTS: All blob types, BlobAdapter interface, createBlobAdapter factory, provider implementations
FEATURES:
  - Unified blob storage abstraction
  - Multi-provider support (Vercel Blob, AWS S3, Cloudflare R2)
  - Type-safe configuration and constraints
SEARCHABLE: blob storage, file upload, storage providers
agent-frontmatter:end */

// Adapter interface
export { createS3BlobAdapter } from "./providers/s3";
// Provider implementations (for advanced usage)
export { createVercelBlobAdapter } from "./providers/vercel-blob";
// Adapter registry
export { createBlobAdapter } from "./registry";
