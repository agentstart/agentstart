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
import type {
  CompleteMultipartUploadCommandOptions,
  CopyCommandOptions,
  ListCommandOptions,
  PutCommandOptions,
  UploadPartCommandOptions,
} from "@vercel/blob";

type VercelBlobModule = typeof import("@vercel/blob");
type PutBodyInput = Parameters<VercelBlobModule["put"]>[1];

let vercelBlobModulePromise: Promise<VercelBlobModule> | undefined;

async function loadVercelBlobModule(): Promise<VercelBlobModule> {
  if (!vercelBlobModulePromise) {
    vercelBlobModulePromise = import("@vercel/blob");
  }
  return vercelBlobModulePromise;
}

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

function normalizeBody(body: unknown): PutBodyInput {
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  return body as PutBodyInput;
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
    put: async (
      pathname: string,
      body: unknown,
      options?: PutCommandOptions,
    ) => {
      const { put } = await loadVercelBlobModule();
      return put(
        resolveKey(pathname, provider.keyPrefix),
        normalizeBody(body),
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      );
    },
    del: async (
      urlOrPathname: string | string[],
      options?: BlobCommandOptions,
    ) => {
      const { del } = await loadVercelBlobModule();
      const targets = Array.isArray(urlOrPathname)
        ? urlOrPathname.map((entry) => applyPrefix(entry, provider.keyPrefix))
        : applyPrefix(urlOrPathname, provider.keyPrefix);
      return del(targets, mergeCommandOptions(provider.token, {}, options));
    },
    head: async (urlOrPathname: string, options?: BlobCommandOptions) => {
      const { head } = await loadVercelBlobModule();
      return head(
        applyPrefix(urlOrPathname, provider.keyPrefix),
        mergeCommandOptions(provider.token, {}, options),
      );
    },
    list: async (options?: ListCommandOptions) => {
      const { list } = await loadVercelBlobModule();
      const merged = mergeCommandOptions(provider.token, {}, options);
      if (options?.prefix || provider.keyPrefix) {
        merged.prefix = options?.prefix
          ? resolveKey(options.prefix, provider.keyPrefix)
          : provider.keyPrefix;
      }
      return list(merged);
    },
    copy: async (options: CopyCommandOptions) => {
      const { copy } = await loadVercelBlobModule();
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
    createMultipartUpload: async (
      pathname: string,
      options?: PutCommandOptions,
    ) => {
      const { createMultipartUpload } = await loadVercelBlobModule();
      return createMultipartUpload(
        resolveKey(pathname, provider.keyPrefix),
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      );
    },
    createMultipartUploader: async (
      pathname: string,
      options?: PutCommandOptions,
    ) => {
      const { createMultipartUploader } = await loadVercelBlobModule();
      return createMultipartUploader(
        resolveKey(pathname, provider.keyPrefix),
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      );
    },
    uploadPart: async (
      pathname: string,
      body: unknown,
      options: UploadPartCommandOptions,
    ) => {
      const { uploadPart } = await loadVercelBlobModule();
      return uploadPart(
        resolveKey(pathname, provider.keyPrefix),
        normalizeBody(body),
        mergeCommandOptions(provider.token, {}, options),
      );
    },
    completeMultipartUpload: async (
      pathname: string,
      parts: { etag: string; partNumber: number }[],
      options: CompleteMultipartUploadCommandOptions,
    ) => {
      const { completeMultipartUpload } = await loadVercelBlobModule();
      return completeMultipartUpload(
        resolveKey(pathname, provider.keyPrefix),
        parts,
        mergeCommandOptions(provider.token, providerPutDefaults, options),
      );
    },
  };
}
