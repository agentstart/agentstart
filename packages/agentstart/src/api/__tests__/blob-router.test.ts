/* agent-frontmatter:start
AGENT: Blob router tests
PURPOSE: Validate blob.getConfig and blob.upload behaviours with mocked adapters
USAGE: Run with vitest to exercise constraint handling and error branches
EXPORTS: none
FEATURES:
  - Mocks adapter resolution per provider
  - Covers constraint failures (size, MIME type) and missing configuration
  - Confirms successful uploads invoke adapter.put with expected payload
SEARCHABLE: blob router test, upload constraints test, getConfig test
agent-frontmatter:end */

import type { BlobAdapter, BlobOptions } from "@agentstart/types";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBlobRouter } from "../routers/blob";

const createBlobAdapter = vi.fn();

vi.mock("@agentstart/blob", () => ({
  createBlobAdapter,
}));

function thrower(name: string) {
  return ({ message }: { message?: string }) => {
    const error = new Error(message ?? name);
    error.name = name;
    throw error;
  };
}

function createTestProcedure() {
  const errors = {
    INTERNAL_SERVER_ERROR: thrower("INTERNAL_SERVER_ERROR"),
    FORBIDDEN: thrower("FORBIDDEN"),
    UNKNOWN: thrower("UNKNOWN"),
    UNAUTHORIZED: thrower("UNAUTHORIZED"),
    NOT_FOUND: thrower("NOT_FOUND"),
  };

  return {
    handler(resolver: any) {
      return async (args: any) =>
        resolver({
          ...args,
          errors,
        });
    },
    input() {
      return this;
    },
  };
}

function createAdapter(overrides: Partial<BlobAdapter> = {}): BlobAdapter {
  return {
    provider: "vercelBlob",
    getConstraints: vi.fn().mockReturnValue(undefined),
    put: vi.fn(),
    del: vi.fn(),
    head: vi.fn(),
    list: vi.fn(),
    copy: vi.fn(),
    createMultipartUpload: vi.fn(),
    createMultipartUploader: vi.fn(),
    uploadPart: vi.fn(),
    completeMultipartUpload: vi.fn(),
    ...overrides,
  };
}

describe("blob router", () => {
  const router = createBlobRouter(createTestProcedure() as any) as any;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getConfig", () => {
    it("returns disabled payload when blob config is absent", async () => {
      const result = await router.getConfig({
        context: {},
      });

      expect(result).toEqual({
        enabled: false,
        constraints: null,
        provider: null,
      });
      expect(createBlobAdapter).not.toHaveBeenCalled();
    });

    it("returns provider info and constraints when adapter resolves", async () => {
      const adapter = createAdapter({
        getConstraints: vi.fn().mockReturnValue({
          maxFileSize: 1024,
          allowedMimeTypes: ["text/plain"],
          maxFiles: 2,
        }),
        provider: "awsS3",
      });
      createBlobAdapter.mockResolvedValue(adapter);

      const result = await router.getConfig({
        context: {
          blob: { provider: { provider: "awsS3" } } as BlobOptions,
        },
      });

      expect(result).toEqual({
        enabled: true,
        constraints: {
          maxFileSize: 1024,
          allowedMimeTypes: ["text/plain"],
          maxFiles: 2,
        },
        provider: "awsS3",
      });
    });
  });

  describe("upload", () => {
    const base64 = (input: string) => Buffer.from(input).toString("base64");

    it("throws when blob storage is not configured", async () => {
      await expect(
        router.upload({
          context: {},
          input: {
            files: [
              {
                name: "file.txt",
                data: base64("hello"),
                type: "text/plain",
              },
            ],
          },
        }),
      ).rejects.toThrowError("Blob storage is not configured");
    });

    it("throws when adapter initialization fails", async () => {
      createBlobAdapter.mockResolvedValue(null);

      await expect(
        router.upload({
          context: {
            blob: { provider: { provider: "vercelBlob" } } as BlobOptions,
          },
          input: {
            files: [
              {
                name: "file.txt",
                data: base64("hello"),
                type: "text/plain",
              },
            ],
          },
        }),
      ).rejects.toThrowError("Failed to initialize blob adapter");
    });

    it("rejects files exceeding configured max size", async () => {
      const adapter = createAdapter({
        getConstraints: vi.fn().mockReturnValue({
          maxFileSize: 1,
          allowedMimeTypes: ["text/plain"],
        }),
      });
      createBlobAdapter.mockResolvedValue(adapter);

      await expect(
        router.upload({
          context: {
            blob: { provider: { provider: "vercelBlob" } } as BlobOptions,
          },
          input: {
            files: [
              {
                name: "big.txt",
                data: base64("hello"),
                type: "text/plain",
              },
            ],
          },
        }),
      ).rejects.toThrowError(
        'File "big.txt" size (5 bytes) exceeds maximum allowed size of 1 bytes',
      );
    });

    it("rejects files with disallowed MIME types", async () => {
      const adapter = createAdapter({
        getConstraints: vi.fn().mockReturnValue({
          allowedMimeTypes: ["text/plain"],
        }),
      });
      createBlobAdapter.mockResolvedValue(adapter);

      await expect(
        router.upload({
          context: {
            blob: { provider: { provider: "vercelBlob" } } as BlobOptions,
          },
          input: {
            files: [
              {
                name: "image.png",
                data: base64("noop"),
                type: "image/png",
              },
            ],
          },
        }),
      ).rejects.toThrowError(
        'File "image.png" type "image/png" is not allowed. Allowed types: text/plain',
      );
    });

    it("propagates adapter authentication errors", async () => {
      createBlobAdapter.mockRejectedValue(new Error("Missing credentials"));

      await expect(
        router.upload({
          context: {
            blob: { provider: { provider: "vercelBlob" } } as BlobOptions,
          },
          input: {
            files: [
              {
                name: "file.txt",
                data: base64("ok"),
                type: "text/plain",
              },
            ],
          },
        }),
      ).rejects.toThrowError("Missing credentials");
    });

    it("uploads files when constraints pass", async () => {
      const put = vi.fn().mockResolvedValue({
        url: "https://example.com/file",
        downloadUrl: "https://example.com/file",
        pathname: "uploads/file.txt",
        contentType: "text/plain",
        contentDisposition: "inline",
      });
      const adapter = createAdapter({
        put,
        getConstraints: vi.fn().mockReturnValue({
          maxFileSize: 10,
          allowedMimeTypes: ["text/plain"],
          maxFiles: 2,
        }),
      });
      createBlobAdapter.mockResolvedValue(adapter);

      const result = await router.upload({
        context: {
          blob: { provider: { provider: "vercelBlob" } } as BlobOptions,
        },
        input: {
          files: [
            {
              name: "file.txt",
              data: base64("ok"),
              type: "text/plain",
            },
          ],
        },
      });

      expect(put).toHaveBeenCalledTimes(1);
      const callArgs = put.mock.calls[0]!;
      const [pathname, buffer, options] = callArgs;
      expect(pathname.startsWith("uploads/")).toBe(true);
      expect(buffer).toBeInstanceOf(Buffer);
      expect((buffer as Buffer).toString()).toBe("ok");
      expect(options).toMatchObject({
        contentType: "text/plain",
        access: "public",
      });
      expect(result).toEqual({
        success: true,
        files: [
          {
            name: "file.txt",
            url: "https://example.com/file",
            downloadUrl: "https://example.com/file",
            pathname: "uploads/file.txt",
            contentType: "text/plain",
            contentDisposition: "inline",
          },
        ],
      });
    });
  });
});
