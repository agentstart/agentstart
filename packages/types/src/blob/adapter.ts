/* agent-frontmatter:start
AGENT: Blob adapter interfaces
PURPOSE: Mirror the @vercel/blob server SDK for provider-specific implementations
USAGE: Implement BlobAdapter to surface blob helpers with provider defaults
EXPORTS: BlobAdapter, BlobAdapterFactory, BlobCommandOptions
FEATURES:
  - Reuses canonical @vercel/blob command signatures
  - Adds constraint accessors for UI & validation
  - Supports async factory resolution per provider
SEARCHABLE: blob adapter, vercel blob api, storage provider
agent-frontmatter:end */

import type {
  CompleteMultipartUploadCommandOptions,
  CopyCommandOptions,
  HeadBlobResult,
  ListBlobResult,
  ListCommandOptions,
  PutBlobResult,
  PutCommandOptions,
  UploadPartCommandOptions,
} from "@vercel/blob";
import type { BlobConstraints, BlobOptions, BlobProvider } from "./provider";

/**
 * Base options shared by all blob commands
 */
export interface BlobCommandOptions {
  token?: string;
}

export interface BlobAdapter {
  readonly provider: BlobProvider["provider"];
  getConstraints(): BlobConstraints | undefined;
  put(
    pathname: string,
    body: unknown,
    options?: PutCommandOptions,
  ): Promise<PutBlobResult>;
  del(
    urlOrPathname: string | string[],
    options?: BlobCommandOptions,
  ): Promise<void>;
  head(
    urlOrPathname: string,
    options?: BlobCommandOptions,
  ): Promise<HeadBlobResult>;
  list(options?: ListCommandOptions): Promise<ListBlobResult>;
  copy(options: CopyCommandOptions): Promise<PutBlobResult>;
  createMultipartUpload(
    pathname: string,
    options?: PutCommandOptions,
  ): Promise<{ key: string; uploadId: string }>;
  createMultipartUploader(
    pathname: string,
    options?: PutCommandOptions,
  ): Promise<unknown>;
  uploadPart(
    pathname: string,
    body: unknown,
    options: UploadPartCommandOptions,
  ): Promise<{ etag: string; partNumber: number }>;
  completeMultipartUpload(
    pathname: string,
    parts: { etag: string; partNumber: number }[],
    options: CompleteMultipartUploadCommandOptions,
  ): Promise<PutBlobResult>;
}

export type BlobAdapterFactory = (
  options: BlobOptions,
) => Promise<BlobAdapter> | BlobAdapter;
