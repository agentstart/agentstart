/* agent-frontmatter:start
AGENT: Vercel Blob adapter export
PURPOSE: Export Vercel Blob storage adapter
USAGE: import { vercelBlobAdapter } from "@agentstart/blob/vercel"
EXPORTS: vercelBlobAdapter
FEATURES:
  - Vercel Blob storage integration
  - Serverless blob storage with automatic global CDN distribution
SEARCHABLE: vercel blob, blob storage, vercel adapter
agent-frontmatter:end */

export { vercelBlobAdapter } from "./adapters/vercel-blob";
export { createVercelBlobAdapter } from "./providers/vercel-blob";
