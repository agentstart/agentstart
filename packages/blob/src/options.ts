/* agent-frontmatter:start
AGENT: Blob provider options
PURPOSE: Define configuration types for blob storage providers and constraints
USAGE: import type { BlobOptions, BlobProvider } from "@agentstart/blob"
EXPORTS: BlobConstraints, BlobProviderVercelBlob, BlobProviderAwsS3, BlobProviderCloudflareR2, BlobProvider, BlobOptions, BlobS3Credentials, BlobS3ACL
FEATURES:
  - Provider-agnostic blob storage configuration
  - Constraint types for file size, MIME types, and file count limits
  - Support for Vercel Blob, AWS S3, and Cloudflare R2
SEARCHABLE: blob options, storage configuration, provider types
agent-frontmatter:end */

/**
 * Upload timing strategy for blob attachments.
 *
 * @example
 * ```ts
 * // Upload immediately after file selection (better UX for large files)
 * uploadTiming: "immediate"
 *
 * // Upload when user submits the message (default, reduces wasted uploads)
 * uploadTiming: "onSubmit"
 * ```
 */
export type BlobUploadTiming = "immediate" | "onSubmit";

export interface BlobConstraints {
  /**
   * Maximum file size in bytes permitted per blob upload.
   */
  maxFileSize?: number;
  /**
   * Whitelist of MIME types allowed for blob uploads.
   */
  allowedMimeTypes?: string[];
  /**
   * Maximum number of files accepted in a single request.
   */
  maxFiles?: number;
  /**
   * When to upload files to blob storage.
   * - "onSubmit" (default): Upload when user submits the message
   * - "immediate": Upload immediately after file selection
   */
  uploadTiming?: BlobUploadTiming;
}

export interface BlobProviderVercelBlob {
  provider: "vercelBlob";
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
}

export interface BlobS3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export type BlobS3ACL =
  | "private"
  | "public-read"
  | "public-read-write"
  | "authenticated-read"
  | "aws-exec-read"
  | "bucket-owner-read"
  | "bucket-owner-full-control";

interface BlobProviderS3Base {
  credentials: BlobS3Credentials;
  bucket: string;
  region?: string;
  endpoint?: string;
  keyPrefix?: string;
  defaultACL?: BlobS3ACL;
  presignExpiresIn?: number;
  virtualHostedStyle?: boolean;
}

export interface BlobProviderAwsS3 extends BlobProviderS3Base {
  provider: "awsS3";
}

export interface BlobProviderCloudflareR2 extends BlobProviderS3Base {
  provider: "cloudflareR2";
  accountId?: string;
}

export type BlobProvider =
  | BlobProviderVercelBlob
  | BlobProviderAwsS3
  | BlobProviderCloudflareR2;

export interface BlobOptions {
  /**
   * Provider configuration describing how blobs should be persisted.
   */
  provider?: BlobProvider;
  /**
   * Constraints enforced before blob requests are dispatched.
   */
  constraints?: BlobConstraints;
}
