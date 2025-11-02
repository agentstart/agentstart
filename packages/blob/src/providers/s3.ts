/* agent-frontmatter:start
AGENT: S3 blob adapter
PURPOSE: Provide BlobAdapter implementation for AWS S3-compatible storage using Vercel Blob API surface
USAGE: Resolved internally when BlobOptions.provider is awsS3 or cloudflareR2
EXPORTS: createS3BlobAdapter
FEATURES:
  - Implements S3-compatible operations using the AWS SDK v3
  - Generates presigned URLs that mirror Vercel Blob semantics
  - Applies provider defaults for ACLs, prefixes, and metadata constraints
SEARCHABLE: s3 blob adapter, vercel blob compatibility, aws sdk
agent-frontmatter:end */

import { Buffer } from "node:buffer";
import type {
  BlobAdapter,
  BlobConstraints,
  BlobOptions,
  BlobProviderAwsS3,
  BlobProviderCloudflareR2,
  BlobS3ACL,
} from "@agentstart/types";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  type ObjectCannedACL,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  CompleteMultipartUploadCommandOptions,
  CopyCommandOptions,
  HeadBlobResult,
  ListBlobResult,
  ListCommandOptions,
  Part,
  PutBlobResult,
  PutCommandOptions,
  UploadPartCommandOptions,
} from "@vercel/blob";

const DEFAULT_PRESIGN_EXPIRATION = 60 * 60; // 1 hour

type S3LikeProvider = BlobProviderAwsS3 | BlobProviderCloudflareR2;

type ListCommandResult = ListBlobResult & { folders: string[] };

function resolveKey(key: string, prefix?: string) {
  if (!prefix) {
    return key;
  }
  const sanitizedPrefix = prefix.replace(/\/+$/, "");
  const sanitizedKey = key.replace(/^\/+/, "");
  return `${sanitizedPrefix}/${sanitizedKey}`;
}

function applyPrefix(path: string, prefix?: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return resolveKey(path, prefix);
}

function normalizeBody(body: unknown): PutObjectCommandInput["Body"] {
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  return body as PutObjectCommandInput["Body"];
}

function mapAccessToACL(
  access?: PutCommandOptions["access"],
  fallback?: BlobS3ACL,
): ObjectCannedACL | undefined {
  if (access === "public") {
    return "public-read";
  }
  if (!fallback) {
    return undefined;
  }
  const allowed: readonly ObjectCannedACL[] = [
    "private",
    "public-read",
    "public-read-write",
    "authenticated-read",
    "aws-exec-read",
    "bucket-owner-read",
    "bucket-owner-full-control",
  ];
  return allowed.includes(fallback as ObjectCannedACL)
    ? (fallback as ObjectCannedACL)
    : undefined;
}

async function createSignedGetUrl(
  client: S3Client,
  provider: S3LikeProvider,
  key: string,
  expiresIn: number,
) {
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: provider.bucket,
      Key: key,
    }),
    { expiresIn },
  );
}

async function buildPutResult(
  client: S3Client,
  provider: S3LikeProvider,
  key: string,
  stat: HeadObjectCommandOutput | undefined,
  overrides?: PutCommandOptions,
): Promise<PutBlobResult> {
  const expiresIn = provider.presignExpiresIn ?? DEFAULT_PRESIGN_EXPIRATION;
  const url = await createSignedGetUrl(client, provider, key, expiresIn);
  return {
    url,
    downloadUrl: url,
    pathname: key,
    contentType:
      stat?.ContentType ?? overrides?.contentType ?? "application/octet-stream",
    contentDisposition: stat?.ContentDisposition ?? "inline",
  };
}

async function mapHeadResult(
  client: S3Client,
  provider: S3LikeProvider,
  key: string,
  stat: HeadObjectCommandOutput,
): Promise<HeadBlobResult> {
  const expiresIn = provider.presignExpiresIn ?? DEFAULT_PRESIGN_EXPIRATION;
  const url = await createSignedGetUrl(client, provider, key, expiresIn);
  return {
    size: stat.ContentLength ?? 0,
    uploadedAt: stat.LastModified ?? new Date(),
    pathname: key,
    contentType: stat.ContentType ?? "application/octet-stream",
    contentDisposition: stat.ContentDisposition ?? "inline",
    url,
    downloadUrl: url,
    cacheControl: stat.CacheControl ?? "",
  };
}

async function mapListResult(
  client: S3Client,
  provider: S3LikeProvider,
  response: ListObjectsV2CommandOutput,
): Promise<ListCommandResult> {
  const expiresIn = provider.presignExpiresIn ?? DEFAULT_PRESIGN_EXPIRATION;
  type S3Object = NonNullable<ListObjectsV2CommandOutput["Contents"]>[number];
  const contents = (response.Contents ?? []) as S3Object[];
  const blobs = (
    await Promise.all(
      contents.map(
        async (item): Promise<ListCommandResult["blobs"][number] | null> => {
          const key = item.Key;
          if (!key) {
            return null;
          }
          const url = await createSignedGetUrl(
            client,
            provider,
            key,
            expiresIn,
          );
          return {
            url,
            downloadUrl: url,
            pathname: key,
            size: item.Size ?? 0,
            uploadedAt: item.LastModified ?? new Date(),
          };
        },
      ),
    )
  ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const folders = (
    (response.CommonPrefixes ?? []) as Array<{ Prefix?: string }>
  )
    .map((entry) => entry.Prefix)
    .filter((prefix): prefix is string => Boolean(prefix));

  return {
    blobs,
    cursor: response.NextContinuationToken ?? undefined,
    hasMore: Boolean(response.IsTruncated),
    folders,
  };
}

function ensurePathname(pathname: string, prefix?: string) {
  if (/^https?:\/\//.test(pathname)) {
    throw new Error("S3 adapter expects a pathname, received URL");
  }
  return applyPrefix(pathname, prefix);
}

function createClient(provider: S3LikeProvider) {
  const region =
    provider.region ??
    (provider.provider === "cloudflareR2" ? "auto" : "us-east-1");

  const config: S3ClientConfig = {
    region,
    credentials: {
      accessKeyId: provider.credentials.accessKeyId,
      secretAccessKey: provider.credentials.secretAccessKey,
      sessionToken: provider.credentials.sessionToken,
    },
  };

  if (provider.endpoint) {
    config.endpoint = provider.endpoint;
  }

  if (provider.virtualHostedStyle === false) {
    config.forcePathStyle = true;
  } else if (
    provider.virtualHostedStyle === undefined &&
    provider.provider === "cloudflareR2"
  ) {
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

export function createS3BlobAdapter(
  blobOptions: BlobOptions,
  provider: S3LikeProvider,
): BlobAdapter {
  const constraints: BlobConstraints | undefined = blobOptions.constraints;
  const client = createClient(provider);

  const putDefaults: PutCommandOptions = {
    access: "public",
  };

  return {
    provider: provider.provider,
    getConstraints: () => constraints,
    put: async (
      pathname: string,
      body: unknown,
      options?: PutCommandOptions,
    ) => {
      const key = resolveKey(pathname, provider.keyPrefix);
      await client.send(
        new PutObjectCommand({
          Bucket: provider.bucket,
          Key: key,
          Body: normalizeBody(body),
          ContentType: options?.contentType,
          ACL: mapAccessToACL(options?.access, provider.defaultACL),
        }),
      );

      let stat: HeadObjectCommandOutput | undefined;
      try {
        stat = await client.send(
          new HeadObjectCommand({
            Bucket: provider.bucket,
            Key: key,
          }),
        );
      } catch {
        stat = undefined;
      }

      return buildPutResult(
        client,
        provider,
        key,
        stat,
        options ?? putDefaults,
      );
    },
    del: async (urlOrPathname: string | string[]) => {
      const targets = Array.isArray(urlOrPathname)
        ? urlOrPathname
        : [urlOrPathname];
      await Promise.all(
        targets.map((target) =>
          client.send(
            new DeleteObjectCommand({
              Bucket: provider.bucket,
              Key: ensurePathname(target, provider.keyPrefix),
            }),
          ),
        ),
      );
    },
    head: async (urlOrPathname: string) => {
      const key = ensurePathname(urlOrPathname, provider.keyPrefix);
      const stat = await client.send(
        new HeadObjectCommand({
          Bucket: provider.bucket,
          Key: key,
        }),
      );
      return mapHeadResult(client, provider, key, stat);
    },
    list: async (options?: ListCommandOptions) => {
      const prefix = options?.prefix
        ? resolveKey(options.prefix, provider.keyPrefix)
        : provider.keyPrefix;
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: provider.bucket,
          Prefix: prefix,
          ContinuationToken: options?.cursor ?? undefined,
          MaxKeys: options?.limit,
        }),
      );
      return mapListResult(client, provider, response);
    },
    copy: async (_options: CopyCommandOptions) => {
      throw new Error("copy is not yet implemented for the S3 upload adapter");
    },
    createMultipartUpload: async (
      _pathname: string,
      _options?: PutCommandOptions,
    ) => {
      throw new Error(
        "createMultipartUpload is not yet implemented for the S3 upload adapter",
      );
    },
    createMultipartUploader: async (
      _pathname: string,
      _options?: PutCommandOptions,
    ) => {
      throw new Error(
        "createMultipartUploader is not yet implemented for the S3 upload adapter",
      );
    },
    uploadPart: async (
      _pathname: string,
      _body: unknown,
      _options: UploadPartCommandOptions,
    ) => {
      throw new Error(
        "uploadPart is not yet implemented for the S3 upload adapter",
      );
    },
    completeMultipartUpload: async (
      _pathname: string,
      _parts: Part[],
      _options: CompleteMultipartUploadCommandOptions,
    ) => {
      throw new Error(
        "completeMultipartUpload is not yet implemented for the S3 upload adapter",
      );
    },
  };
}
