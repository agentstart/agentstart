/* agent-frontmatter:start
AGENT: S3 blob adapter factories
PURPOSE: Create BlobAdapterFactory for S3-compatible storage (AWS S3 and Cloudflare R2)
USAGE: blob: s3BlobAdapter({ credentials, bucket, ... }) or blob: r2BlobAdapter({ credentials, bucket, accountId, ... })
EXPORTS: s3BlobAdapter, r2BlobAdapter
FEATURES:
  - Returns factory function compatible with AgentStartOptions
  - Wraps createS3BlobAdapter with cleaner config interface
  - Supports both AWS S3 and Cloudflare R2
SEARCHABLE: s3 blob adapter factory, r2 blob adapter factory, blob storage
agent-frontmatter:end */

import type {
  AgentStartOptions,
  BlobAdapter,
  BlobAdapterFactory,
  BlobConstraints,
  BlobS3ACL,
  BlobS3Credentials,
} from "@agentstart/types";
import { createS3BlobAdapter } from "../providers/s3";

interface S3BlobConfigBase {
  /**
   * S3 credentials
   */
  credentials: BlobS3Credentials;
  /**
   * S3 bucket name
   */
  bucket: string;
  /**
   * AWS region (defaults to us-east-1)
   */
  region?: string;
  /**
   * Custom S3 endpoint (for S3-compatible services)
   */
  endpoint?: string;
  /**
   * Optional prefix applied to stored blob paths
   */
  keyPrefix?: string;
  /**
   * Default ACL for uploaded objects
   */
  defaultACL?: BlobS3ACL;
  /**
   * Presigned URL expiration time in seconds (defaults to 3600)
   */
  presignExpiresIn?: number;
  /**
   * Use virtual-hosted-style URLs instead of path-style
   */
  virtualHostedStyle?: boolean;
  /**
   * Constraints enforced before blob requests are dispatched
   */
  constraints?: BlobConstraints;
}

export interface S3BlobConfig extends S3BlobConfigBase {
  // AWS S3 specific
}

export interface R2BlobConfig extends S3BlobConfigBase {
  /**
   * Cloudflare account ID (optional, used for constructing endpoint)
   */
  accountId?: string;
}

export function s3BlobAdapter(config: S3BlobConfig): BlobAdapterFactory {
  return async (_options: AgentStartOptions): Promise<BlobAdapter> => {
    return createS3BlobAdapter(
      {
        constraints: config.constraints,
      },
      {
        provider: "awsS3",
        credentials: config.credentials,
        bucket: config.bucket,
        region: config.region,
        endpoint: config.endpoint,
        keyPrefix: config.keyPrefix,
        defaultACL: config.defaultACL,
        presignExpiresIn: config.presignExpiresIn,
        virtualHostedStyle: config.virtualHostedStyle,
      },
    );
  };
}

export function r2BlobAdapter(config: R2BlobConfig): BlobAdapterFactory {
  return async (_options: AgentStartOptions): Promise<BlobAdapter> => {
    // Cloudflare R2 is S3-compatible
    const endpoint =
      config.endpoint ??
      (config.accountId
        ? `https://${config.accountId}.r2.cloudflarestorage.com`
        : undefined);

    return createS3BlobAdapter(
      {
        constraints: config.constraints,
      },
      {
        provider: "cloudflareR2",
        credentials: config.credentials,
        bucket: config.bucket,
        region: config.region ?? "auto",
        endpoint,
        keyPrefix: config.keyPrefix,
        defaultACL: config.defaultACL,
        presignExpiresIn: config.presignExpiresIn,
        virtualHostedStyle: config.virtualHostedStyle,
        accountId: config.accountId,
      },
    );
  };
}
