/* agent-frontmatter:start
AGENT: Blob storage package entry point
PURPOSE: Export all blob storage types, adapters, and utilities
USAGE: import { vercelBlobAdapter, s3BlobAdapter, r2BlobAdapter } from "@agentstart/blob"
EXPORTS: All blob types, BlobAdapter interface, adapter factories, provider implementations
FEATURES:
  - Unified blob storage abstraction
  - Multi-provider support (Vercel Blob, AWS S3, Cloudflare R2)
  - Type-safe configuration via adapter factories
SEARCHABLE: blob storage, file upload, storage providers
agent-frontmatter:end */

export { r2BlobAdapter, s3BlobAdapter } from "./adapters/s3";
// Adapter factories (recommended usage)
export { vercelBlobAdapter } from "./adapters/vercel-blob";
// Utility functions
export { getBlob } from "./get-blob";
// Legacy provider implementations (for advanced usage)
export { createS3BlobAdapter } from "./providers/s3";
export { createVercelBlobAdapter } from "./providers/vercel-blob";
