/* agent-frontmatter:start
AGENT: Vercel Blob adapter
PURPOSE: Implement BlobAdapter using the official @vercel/blob SDK with provider defaults
USAGE: Resolved internally when BlobOptions.provider is vercelBlob
EXPORTS: createVercelBlobAdapter
FEATURES:
  - Wraps @vercel/blob helpers while injecting token/access defaults
  - Applies optional key prefixing for shared buckets
  - Surfaces constraint metadata for downstream validation
SEARCHABLE: vercel blob, blob adapter, blob put, storage
agent-frontmatter:end */

import { Buffer } from "node:buffer";
import type {
  BlobAdapter,
  BlobCommandOptions,
  BlobConstraints,
  BlobOptions,
  BlobProviderVercelBlob,
} from "@agentstart/types";
import {
  type CompleteMultipartUploadCommandOptions,
  type CopyCommandOptions,
  completeMultipartUpload,
  copy,
  createMultipartUpload,
  createMultipartUploader,
  del,
  head,
  type ListCommandOptions,
  list,
  type PutCommandOptions,
  put,
  type UploadPartCommandOptions,
  uploadPart,
} from "@vercel/blob";

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

function normalizeBody(body: unknown): Parameters<typeof put>[1] {
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  return body as Parameters<typeof put>[1];
}

type AnyCommandOptions =
  | BlobCommandOptions
  | PutCommandOptions
  | ListCommandOptions
  | UploadPartCommandOptions
  | CompleteMultipartUploadCommandOptions
  | CopyCommandOptions;

function mergeCommandOptions<T extends AnyCommandOptions>(
  token: string,
  providerDefaults: Partial<PutCommandOptions>,
  input?: T,
): T & BlobCommandOptions {
  const base: BlobCommandOptions = {
    token,
  };
  const merged = {
    ...base,
    ...providerDefaults,
    ...(input ?? {}),
  } as T & BlobCommandOptions;
  return merged;
}

export function createVercelBlobAdapter(
  blobOptions: BlobOptions,
  provider: BlobProviderVercelBlob,
): BlobAdapter {
  const constraints: BlobConstraints | undefined = blobOptions.constraints;
  const providerPutDefaults: Partial<PutCommandOptions> = {
    access: provider.access ?? "public",
    addRandomSuffix: provider.addRandomSuffix ?? false,
    allowOverwrite: provider.allowOverwrite ?? true,
    cacheControlMaxAge: provider.cacheControlMaxAge,
  };

  return {
    provider: provider.provider,
    getConstraints: () => constraints,
    put: (pathname: string, body: unknown, options?: PutCommandOptions) =>
      put(
        resolveKey(pathname, provider.keyPrefix),
        normalizeBody(body),
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      ),
    del: (urlOrPathname: string | string[], options?: BlobCommandOptions) => {
      const targets = Array.isArray(urlOrPathname)
        ? urlOrPathname.map((entry) => applyPrefix(entry, provider.keyPrefix))
        : applyPrefix(urlOrPathname, provider.keyPrefix);
      return del(targets, mergeCommandOptions(provider.token, {}, options));
    },
    head: (urlOrPathname: string, options?: BlobCommandOptions) =>
      head(
        applyPrefix(urlOrPathname, provider.keyPrefix),
        mergeCommandOptions(provider.token, {}, options),
      ),
    list: (options?: ListCommandOptions) => {
      const merged = mergeCommandOptions(provider.token, {}, options);
      if (options?.prefix || provider.keyPrefix) {
        merged.prefix = options?.prefix
          ? resolveKey(options.prefix, provider.keyPrefix)
          : provider.keyPrefix;
      }
      return list(merged);
    },
    copy: (options: CopyCommandOptions) => {
      const { source, target, ...rest } = options as CopyCommandOptions & {
        source: string;
        target: string;
      };
      const merged = mergeCommandOptions(
        provider.token,
        {},
        rest as CopyCommandOptions,
      );
      return copy(
        applyPrefix(source, provider.keyPrefix),
        resolveKey(target, provider.keyPrefix),
        merged,
      );
    },
    createMultipartUpload: (pathname: string, options?: PutCommandOptions) =>
      createMultipartUpload(
        resolveKey(pathname, provider.keyPrefix),
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      ),
    createMultipartUploader: (pathname: string, options?: PutCommandOptions) =>
      createMultipartUploader(
        resolveKey(pathname, provider.keyPrefix),
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      ),
    uploadPart: (
      pathname: string,
      body: unknown,
      options: UploadPartCommandOptions,
    ) =>
      uploadPart(
        resolveKey(pathname, provider.keyPrefix),
        normalizeBody(body),
        mergeCommandOptions(provider.token, {}, options),
      ),
    completeMultipartUpload: (
      pathname: string,
      parts: { etag: string; partNumber: number }[],
      options: CompleteMultipartUploadCommandOptions,
    ) =>
      completeMultipartUpload(
        resolveKey(pathname, provider.keyPrefix),
        parts,
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      ),
  };
}
