/* agent-frontmatter:start
AGENT: S3-compatible blob adapter exports
PURPOSE: Export S3 and R2 blob storage adapters
USAGE: import { s3BlobAdapter, r2BlobAdapter } from "@agentstart/blob/s3"
EXPORTS: s3BlobAdapter, r2BlobAdapter
FEATURES:
  - AWS S3 storage integration
  - Cloudflare R2 storage integration (S3-compatible)
  - Industry-standard object storage
SEARCHABLE: s3, r2, aws s3, cloudflare r2, blob storage
agent-frontmatter:end */

export { r2BlobAdapter, s3BlobAdapter } from "./adapters/s3";
export { createS3BlobAdapter } from "./providers/s3";
