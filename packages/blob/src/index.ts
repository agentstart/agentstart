/* agent-frontmatter:start
AGENT: Blob storage package entry point
PURPOSE: Export blob storage types and utilities (types only, no adapters)
USAGE: import { getBlob } from "@agentstart/blob"
EXPORTS: getBlob utility, BlobAdapter types
FEATURES:
  - Unified blob storage abstraction
  - Type-safe configuration
  - For adapters, use granular imports: @agentstart/blob/vercel, @agentstart/blob/s3
SEARCHABLE: blob storage, file upload, storage types
agent-frontmatter:end */

// Utility functions
export { getBlob } from "./get-blob";
