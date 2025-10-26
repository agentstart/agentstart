/* agent-frontmatter:start
AGENT: Blob adapter registry tests
PURPOSE: Verify createBlobAdapter dispatches to each provider and memoises results
USAGE: Run with vitest to ensure provider-specific factories execute as expected
EXPORTS: none
FEATURES:
  - Covers vercelBlob, awsS3, and cloudflareR2 branches
  - Ensures adapters inherit cached instances per options object
SEARCHABLE: blob registry test, createBlobAdapter test, storage provider tests
agent-frontmatter:end */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BlobAdapter } from "../adapter";
import type { BlobOptions } from "../options";

const vercelFactory = vi.fn();
const s3Factory = vi.fn();

vi.mock("../providers/vercel-blob", () => ({
  createVercelBlobAdapter: vercelFactory,
}));

vi.mock("../providers/s3", () => ({
  createS3BlobAdapter: s3Factory,
}));

const { createBlobAdapter } = await import("../registry");

function createStubAdapter(provider: BlobAdapter["provider"]) {
  return {
    provider,
    getConstraints: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    head: vi.fn(),
    list: vi.fn(),
    copy: vi.fn(),
    createMultipartUpload: vi.fn(),
    createMultipartUploader: vi.fn(),
    uploadPart: vi.fn(),
    completeMultipartUpload: vi.fn(),
  } satisfies BlobAdapter;
}

describe("createBlobAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when options are undefined or provider missing", async () => {
    expect(await createBlobAdapter(undefined)).toBeNull();
    expect(
      await createBlobAdapter({
        constraints: undefined,
      } as BlobOptions),
    ).toBeNull();
    expect(vercelFactory).not.toHaveBeenCalled();
    expect(s3Factory).not.toHaveBeenCalled();
  });

  it("creates Vercel Blob adapter when provider is vercelBlob", async () => {
    const options = {
      provider: {
        provider: "vercelBlob",
        token: "token",
      },
    } satisfies BlobOptions;
    const adapter = createStubAdapter("vercelBlob");
    vercelFactory.mockReturnValue(adapter);

    const result = await createBlobAdapter(options);

    expect(result).toBe(adapter);
    expect(vercelFactory).toHaveBeenCalledWith(options, options.provider);
    expect(s3Factory).not.toHaveBeenCalled();
  });

  it("reuses memoised adapter instances for identical options object", async () => {
    const options = {
      provider: {
        provider: "vercelBlob",
        token: "token",
      },
    } as BlobOptions;
    const adapter = createStubAdapter("vercelBlob");
    vercelFactory.mockReturnValue(adapter);

    const [first, second] = await Promise.all([
      createBlobAdapter(options),
      createBlobAdapter(options),
    ]);

    expect(first).toBe(adapter);
    expect(second).toBe(adapter);
    expect(vercelFactory).toHaveBeenCalledTimes(1);
  });

  it("creates S3 adapter when provider is awsS3", async () => {
    const options = {
      provider: {
        provider: "awsS3",
        credentials: {
          accessKeyId: "id",
          secretAccessKey: "secret",
        },
        bucket: "bucket",
        region: "us-east-1",
      },
    } satisfies BlobOptions;
    const adapter = createStubAdapter("awsS3");
    s3Factory.mockReturnValue(adapter);

    const result = await createBlobAdapter(options);

    expect(result).toBe(adapter);
    expect(s3Factory).toHaveBeenCalledWith(options, options.provider);
    expect(vercelFactory).not.toHaveBeenCalled();
  });

  it("creates S3 adapter when provider is cloudflareR2", async () => {
    const options = {
      provider: {
        provider: "cloudflareR2",
        credentials: {
          accessKeyId: "id",
          secretAccessKey: "secret",
        },
        bucket: "bucket",
        accountId: "account",
        endpoint: "https://example.com",
      },
    } satisfies BlobOptions;
    const adapter = createStubAdapter("cloudflareR2");
    s3Factory.mockReturnValue(adapter);

    const result = await createBlobAdapter(options);

    expect(result).toBe(adapter);
    expect(s3Factory).toHaveBeenCalledWith(options, options.provider);
    expect(vercelFactory).not.toHaveBeenCalled();
  });
});
