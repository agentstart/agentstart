/* agent-frontmatter:start
AGENT: S3 blob adapter
PURPOSE: Provide BlobAdapter implementation for AWS S3-compatible storage using Vercel Blob API surface
USAGE: Resolved internally when BlobOptions.provider is awsS3 or cloudflareR2
EXPORTS: createS3BlobAdapter
FEATURES:
  - Implements S3-compatible operations using aws4fetch + signed fetch calls
  - Generates presigned URLs that mirror Vercel Blob semantics
  - Applies provider defaults for ACLs, prefixes, and metadata constraints
  - Parses XML responses with fast-xml-parser for worker-safe list handling
SEARCHABLE: s3 blob adapter, vercel blob compatibility, aws sdk
agent-frontmatter:end */

import type {
  BlobAdapter,
  BlobConstraints,
  BlobOptions,
  BlobProviderAwsS3,
  BlobProviderCloudflareR2,
  BlobS3ACL,
} from "@agentstart/types";
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
import { AwsClient } from "aws4fetch";
import { XMLParser } from "fast-xml-parser";

type HeadObjectStat = {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  contentLength?: number;
  lastModified?: Date;
};

type ListBucketParsedObject = {
  key: string;
  size?: number;
  lastModified?: Date;
};

type ListBucketParsedResponse = {
  contents: ListBucketParsedObject[];
  folders: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
};

const DEFAULT_PRESIGN_EXPIRATION = 60 * 60; // 1 hour
const MAX_PRESIGN_EXPIRATION = 7 * 24 * 60 * 60; // 7 days

type S3LikeProvider = BlobProviderAwsS3 | BlobProviderCloudflareR2;

type ListCommandResult = ListBlobResult & { folders: string[] };
type SignedUrlFactory = (key: string) => Promise<string>;
type BinaryBody = ArrayBuffer | Blob | ReadableStream;
type S3RequestOptions = {
  method: string;
  key?: string;
  headers?: Record<string, string>;
  body?: BinaryBody | null;
  query?: Record<string, string | undefined>;
};
type S3RequestExecutor = (options: S3RequestOptions) => Promise<Response>;
type ObjectCannedACL =
  | "private"
  | "public-read"
  | "public-read-write"
  | "authenticated-read"
  | "aws-exec-read"
  | "bucket-owner-read"
  | "bucket-owner-full-control";

const TEXT_NODE_KEY = "#text";
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

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

function normalizeBody(body: unknown): BinaryBody {
  if (body === null || body === undefined) {
    throw new Error(
      "S3 adapter expects a file/blob body but received null/undefined",
    );
  }
  if (body instanceof ArrayBuffer) {
    return body;
  }
  if (ArrayBuffer.isView(body)) {
    return cloneToArrayBuffer(body);
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return body;
  }
  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
    return body;
  }
  if (typeof body === "string") {
    throw new Error(
      "S3 adapter cannot upload string bodies directly; convert the payload to Uint8Array/ArrayBuffer first",
    );
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    throw new Error(
      "S3 adapter cannot upload FormData; extract the file/blob entry before calling put()",
    );
  }
  if (
    typeof URLSearchParams !== "undefined" &&
    body instanceof URLSearchParams
  ) {
    throw new Error(
      "S3 adapter cannot upload URLSearchParams; convert the content to binary first",
    );
  }
  throw new Error(
    `S3 adapter received unsupported body type: ${describeBody(body)}`,
  );
}

function cloneToArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  if (view.buffer instanceof ArrayBuffer) {
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength,
    );
  }
  const copy = new Uint8Array(view.byteLength);
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return copy.buffer;
}

function toFetchBody(body?: BinaryBody | null): BodyInit | null {
  if (body === undefined || body === null) {
    return null;
  }
  // Cloudflare's BodyInit typing omits BufferSource even though runtime fetch accepts it.
  // We normalize to ArrayBuffer/Blob/ReadableStream above, so asserting here is safe.
  return body as BodyInit;
}

function describeBody(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  const constructorName =
    typeof value === "object"
      ? (value as { constructor?: { name?: string } })?.constructor?.name
      : undefined;
  if (constructorName && constructorName !== "Object") {
    return constructorName;
  }
  return typeof value;
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

function resolveRegion(provider: S3LikeProvider) {
  if (provider.region) {
    return provider.region;
  }
  return provider.provider === "cloudflareR2" ? "auto" : "us-east-1";
}

function shouldUseVirtualHostedStyle(provider: S3LikeProvider) {
  if (provider.virtualHostedStyle !== undefined) {
    return provider.virtualHostedStyle;
  }
  return provider.provider !== "cloudflareR2";
}

function resolvePresignExpiration(input?: number) {
  if (typeof input !== "number" || Number.isNaN(input) || input <= 0) {
    return DEFAULT_PRESIGN_EXPIRATION;
  }
  return Math.min(Math.floor(input), MAX_PRESIGN_EXPIRATION);
}

function resolveEndpoint(provider: S3LikeProvider, region: string) {
  if (provider.endpoint) {
    return provider.endpoint;
  }
  if (provider.provider === "cloudflareR2") {
    if (provider.accountId) {
      return `https://${provider.accountId}.r2.cloudflarestorage.com`;
    }
    throw new Error(
      "Cloudflare R2 adapter requires either an endpoint or accountId",
    );
  }
  return `https://s3.${region}.amazonaws.com`;
}

function normalizeEndpoint(endpoint: string) {
  const sanitized = endpoint.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(sanitized)) {
    return sanitized;
  }
  return `https://${sanitized}`;
}

function encodeS3Key(key: string) {
  if (!key) {
    return "";
  }
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildObjectUrl(
  endpoint: string,
  provider: S3LikeProvider,
  key: string,
  useVirtualHostedStyle: boolean,
) {
  const url = new URL(endpoint);
  const basePath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  const encodedKey = encodeS3Key(key);
  if (useVirtualHostedStyle) {
    if (
      url.hostname !== provider.bucket &&
      !url.hostname.startsWith(`${provider.bucket}.`)
    ) {
      url.hostname = `${provider.bucket}.${url.hostname}`;
    }
    const keyPath =
      encodedKey === ""
        ? "/"
        : encodedKey.startsWith("/")
          ? encodedKey
          : `/${encodedKey}`;
    url.pathname = `${basePath}${keyPath}` || "/";
  } else {
    const bucketSegment = `/${encodeURIComponent(provider.bucket)}`;
    const keySuffix =
      encodedKey === ""
        ? ""
        : encodedKey.startsWith("/")
          ? encodedKey
          : `/${encodedKey}`;
    const combined = `${basePath}${bucketSegment}${keySuffix}`;
    url.pathname = combined || bucketSegment;
  }
  if (!url.pathname.startsWith("/")) {
    url.pathname = `/${url.pathname}`;
  }
  return url;
}

function createS3RequestExecutor(
  awsClient: AwsClient,
  endpoint: string,
  provider: S3LikeProvider,
  useVirtualHostedStyle: boolean,
): S3RequestExecutor {
  return async (options: S3RequestOptions) => {
    const targetKey = options.key ?? "";
    const url = buildObjectUrl(
      endpoint,
      provider,
      targetKey,
      useVirtualHostedStyle,
    );
    if (options.query) {
      for (const [queryKey, queryValue] of Object.entries(options.query)) {
        if (queryValue !== undefined && queryValue !== null) {
          url.searchParams.set(queryKey, queryValue);
        }
      }
    }
    return awsClient.fetch(url.toString(), {
      method: options.method,
      headers: options.headers,
      body: toFetchBody(options.body),
    });
  };
}

async function ensureSuccessfulResponse(
  response: Response,
  action: string,
): Promise<Response> {
  if (response.ok) {
    return response;
  }
  let message = "";
  try {
    message = await response.text();
  } catch {
    message = "";
  }
  const suffix = message ? ` - ${message}` : "";
  throw new Error(
    `S3 ${action} failed (${response.status} ${response.statusText})${suffix}`,
  );
}

function readNodeText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (
    value &&
    typeof value === "object" &&
    TEXT_NODE_KEY in (value as Record<string, unknown>)
  ) {
    const textValue = (value as Record<string, unknown>)[TEXT_NODE_KEY];
    if (typeof textValue === "string") {
      return textValue;
    }
    if (typeof textValue === "number" && Number.isFinite(textValue)) {
      return String(textValue);
    }
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = readNodeText(value);
  if (!text) {
    return undefined;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const text = readNodeText(value);
  if (!text) {
    return false;
  }
  return text.toLowerCase() === "true";
}

type ParsedListBucketContent = {
  Key?: unknown;
  Size?: unknown;
  LastModified?: unknown;
};

type ParsedListBucketPrefix = {
  Prefix?: unknown;
};

type ParsedListBucketResult = {
  Contents?: ParsedListBucketContent | ParsedListBucketContent[];
  CommonPrefixes?: ParsedListBucketPrefix | ParsedListBucketPrefix[];
  NextContinuationToken?: unknown;
  ContinuationToken?: unknown;
  IsTruncated?: unknown;
};

function parseListBucketXml(xml: string): ListBucketParsedResponse {
  const parsed = xmlParser.parse(xml) as
    | { ListBucketResult?: ParsedListBucketResult }
    | ParsedListBucketResult
    | undefined;
  const result =
    (parsed &&
    typeof parsed === "object" &&
    "ListBucketResult" in parsed &&
    parsed.ListBucketResult
      ? (parsed.ListBucketResult as ParsedListBucketResult)
      : ((parsed ?? {}) as ParsedListBucketResult)) ?? {};

  const contents = ensureArray<ParsedListBucketContent>(
    result.Contents as
      | ParsedListBucketContent
      | ParsedListBucketContent[]
      | undefined,
  )
    .map((entry): ListBucketParsedObject | null => {
      if (!entry) {
        return null;
      }
      const key = readNodeText(entry.Key);
      if (!key) {
        return null;
      }
      return {
        key,
        size: parseNumber(entry.Size),
        lastModified: parseDate(readNodeText(entry.LastModified)),
      };
    })
    .filter((entry): entry is ListBucketParsedObject => entry !== null);

  const folders = ensureArray<ParsedListBucketPrefix | string>(
    result.CommonPrefixes as
      | ParsedListBucketPrefix
      | ParsedListBucketPrefix[]
      | string
      | string[]
      | undefined,
  )
    .map((entry) =>
      typeof entry === "string"
        ? readNodeText(entry)
        : readNodeText(entry?.Prefix),
    )
    .filter((prefix): prefix is string => Boolean(prefix));

  return {
    contents,
    folders,
    nextContinuationToken:
      readNodeText(result.NextContinuationToken ?? result.ContinuationToken) ??
      undefined,
    isTruncated: parseBoolean(result.IsTruncated),
  };
}

function parseHeadResponse(response: Response): HeadObjectStat {
  const lengthHeader = response.headers.get("content-length") ?? undefined;
  const contentLength = lengthHeader ? Number(lengthHeader) : undefined;
  return {
    contentType: response.headers.get("content-type") ?? undefined,
    contentDisposition:
      response.headers.get("content-disposition") ?? undefined,
    cacheControl: response.headers.get("cache-control") ?? undefined,
    contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
    lastModified: parseDate(response.headers.get("last-modified")),
  };
}

function createPresignUrlFactory(
  provider: S3LikeProvider,
  region: string,
  awsClient: AwsClient,
  endpoint: string,
  useVirtualHostedStyle: boolean,
): (key: string, expiresIn: number) => Promise<string> {
  return async (key: string, expiresIn: number) => {
    const url = buildObjectUrl(endpoint, provider, key, useVirtualHostedStyle);
    url.searchParams.set("X-Amz-Expires", String(expiresIn));
    const signedRequest = await awsClient.sign(url.toString(), {
      method: "GET",
      aws: {
        service: "s3",
        region,
        signQuery: true,
      },
    });
    return signedRequest.url;
  };
}

async function buildPutResult(
  getSignedUrl: SignedUrlFactory,
  key: string,
  stat: HeadObjectStat | undefined,
  overrides?: PutCommandOptions,
): Promise<PutBlobResult> {
  const url = await getSignedUrl(key);
  return {
    url,
    downloadUrl: url,
    pathname: key,
    contentType:
      stat?.contentType ?? overrides?.contentType ?? "application/octet-stream",
    contentDisposition: stat?.contentDisposition ?? "inline",
  };
}

async function mapHeadResult(
  getSignedUrl: SignedUrlFactory,
  key: string,
  stat: HeadObjectStat,
): Promise<HeadBlobResult> {
  const url = await getSignedUrl(key);
  return {
    size: stat.contentLength ?? 0,
    uploadedAt: stat.lastModified ?? new Date(),
    pathname: key,
    contentType: stat.contentType ?? "application/octet-stream",
    contentDisposition: stat.contentDisposition ?? "inline",
    url,
    downloadUrl: url,
    cacheControl: stat.cacheControl ?? "",
  };
}

async function mapListResult(
  getSignedUrl: SignedUrlFactory,
  response: ListBucketParsedResponse,
): Promise<ListCommandResult> {
  const blobs = await Promise.all(
    response.contents.map(async (item) => {
      const url = await getSignedUrl(item.key);
      return {
        url,
        downloadUrl: url,
        pathname: item.key,
        size: item.size ?? 0,
        uploadedAt: item.lastModified ?? new Date(),
      };
    }),
  );

  return {
    blobs,
    cursor: response.nextContinuationToken,
    hasMore: response.isTruncated,
    folders: response.folders,
  };
}

function ensurePathname(pathname: string, prefix?: string) {
  if (/^https?:\/\//.test(pathname)) {
    throw new Error("S3 adapter expects a pathname, received URL");
  }
  return applyPrefix(pathname, prefix);
}

export function createS3BlobAdapter(
  blobOptions: BlobOptions,
  provider: S3LikeProvider,
): BlobAdapter {
  const constraints: BlobConstraints | undefined = blobOptions.constraints;
  const region = resolveRegion(provider);
  const endpoint = normalizeEndpoint(resolveEndpoint(provider, region));
  const useVirtualHostedStyle = shouldUseVirtualHostedStyle(provider);
  const awsClient = new AwsClient({
    accessKeyId: provider.credentials.accessKeyId,
    secretAccessKey: provider.credentials.secretAccessKey,
    sessionToken: provider.credentials.sessionToken,
    service: "s3",
    region,
  });
  const request = createS3RequestExecutor(
    awsClient,
    endpoint,
    provider,
    useVirtualHostedStyle,
  );
  const presignExpiresIn = resolvePresignExpiration(provider.presignExpiresIn);
  const presignUrlFactory = createPresignUrlFactory(
    provider,
    region,
    awsClient,
    endpoint,
    useVirtualHostedStyle,
  );
  const getSignedUrl: SignedUrlFactory = (key) =>
    presignUrlFactory(key, presignExpiresIn);

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
      const normalizedBody = normalizeBody(body);
      const headers: Record<string, string> = {};
      const aclHeader = mapAccessToACL(options?.access, provider.defaultACL);
      if (options?.contentType) {
        headers["content-type"] = options.contentType;
      }
      if (aclHeader) {
        headers["x-amz-acl"] = aclHeader;
      }
      const requestHeaders =
        Object.keys(headers).length > 0 ? headers : undefined;
      await ensureSuccessfulResponse(
        await request({
          method: "PUT",
          key,
          body: normalizedBody,
          headers: requestHeaders,
        }),
        "put object",
      );

      let stat: HeadObjectStat | undefined;
      try {
        const headResponse = await ensureSuccessfulResponse(
          await request({
            method: "HEAD",
            key,
          }),
          "head object",
        );
        stat = parseHeadResponse(headResponse);
      } catch {
        stat = undefined;
      }

      return buildPutResult(getSignedUrl, key, stat, options ?? putDefaults);
    },
    del: async (urlOrPathname: string | string[]) => {
      const targets = Array.isArray(urlOrPathname)
        ? urlOrPathname
        : [urlOrPathname];
      await Promise.all(
        targets.map(async (target) => {
          await ensureSuccessfulResponse(
            await request({
              method: "DELETE",
              key: ensurePathname(target, provider.keyPrefix),
            }),
            "delete object",
          );
        }),
      );
    },
    head: async (urlOrPathname: string) => {
      const key = ensurePathname(urlOrPathname, provider.keyPrefix);
      const response = await ensureSuccessfulResponse(
        await request({
          method: "HEAD",
          key,
        }),
        "head object",
      );
      return mapHeadResult(getSignedUrl, key, parseHeadResponse(response));
    },
    list: async (options?: ListCommandOptions) => {
      const prefix = options?.prefix
        ? resolveKey(options.prefix, provider.keyPrefix)
        : provider.keyPrefix;
      const response = await ensureSuccessfulResponse(
        await request({
          method: "GET",
          query: {
            "list-type": "2",
            prefix: prefix ?? undefined,
            "continuation-token": options?.cursor ?? undefined,
            "max-keys":
              options?.limit !== undefined ? String(options.limit) : undefined,
          },
        }),
        "list objects",
      );
      const xml = await response.text();
      const parsed = parseListBucketXml(xml);
      return mapListResult(getSignedUrl, parsed);
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
