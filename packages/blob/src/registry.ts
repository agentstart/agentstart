/* agent-frontmatter:start
AGENT: Blob adapter registry
PURPOSE: Resolve BlobAdapter instances for configured storage providers
USAGE: await createBlobAdapter(options)
EXPORTS: createBlobAdapter
FEATURES:
  - Dispatches to provider-specific adapters (Vercel Blob, S3)
  - Memoizes adapter instances per BlobOptions object
  - Provides descriptive errors for unsupported configurations
SEARCHABLE: blob adapter registry, storage provider factory, blob index
agent-frontmatter:end */

import type { BlobAdapter } from "./adapter";
import type { BlobOptions, BlobProvider } from "./options";
import { createS3BlobAdapter } from "./providers/s3";
import { createVercelBlobAdapter } from "./providers/vercel-blob";

type BlobOptionsWithProvider = BlobOptions & { provider: BlobProvider };

const adapterCache = new WeakMap<
  BlobOptionsWithProvider,
  Promise<BlobAdapter>
>();

function hasProvider(options: BlobOptions): options is BlobOptionsWithProvider {
  return options.provider != null;
}

export async function createBlobAdapter(
  options: BlobOptions | undefined,
): Promise<BlobAdapter | null> {
  if (!options || !hasProvider(options)) {
    return null;
  }

  if (!adapterCache.has(options)) {
    adapterCache.set(options, resolveAdapter(options));
  }

  return adapterCache.get(options) ?? null;
}

async function resolveAdapter(
  options: BlobOptionsWithProvider,
): Promise<BlobAdapter> {
  const provider = options.provider;
  switch (provider.provider) {
    case "vercelBlob":
      return createVercelBlobAdapter(options, provider);
    case "awsS3":
    case "cloudflareR2":
      return createS3BlobAdapter(options, provider);
    default:
      assertNever(provider);
  }
}

function assertNever(value: never): never {
  throw new Error(
    `Unsupported blob provider: ${(value as BlobProvider["provider"]).toString()}`,
  );
}
