/* agent-frontmatter:start
AGENT: Blob router using oRPC
PURPOSE: Expose blob storage configuration and upload endpoints
USAGE: blob.getConfig() to fetch constraints, blob.upload() to upload files
EXPORTS: blobRouter, createBlobRouter
FEATURES:
  - Returns blob constraints (maxFileSize, allowedMimeTypes, maxFiles)
  - Exposes provider capabilities to clients
  - Handles file uploads via ORPC with base64 encoding
  - Works with any configured blob adapter on the context
  - Supports dynamic middleware via procedure builder
SEARCHABLE: blob router, blob config, upload constraints api, file upload
agent-frontmatter:end */

import { createBlobAdapter } from "@agentstart/blob";
import { z } from "zod";
import { publicProcedure } from "@/api/procedures";

const uploadFileSchema = z.object({
  name: z.string().min(1),
  data: z.string(), // base64 encoded file data
  type: z.string(), // MIME type
});

/**
 * Create blob router with optional custom procedure builder
 */
export function createBlobRouter(procedure = publicProcedure) {
  return {
    getConfig: procedure.handler(async ({ context, errors }) => {
      try {
        if (!context.blob) {
          return {
            enabled: false,
            constraints: null,
            provider: null,
          };
        }

        const adapter = await createBlobAdapter(context.blob);
        if (!adapter) {
          return {
            enabled: false,
            constraints: null,
            provider: null,
          };
        }

        const constraints = adapter.getConstraints();
        return {
          enabled: true,
          constraints: constraints ?? null,
          provider: adapter.provider,
        };
      } catch (error) {
        console.error("Error fetching blob config:", error);
        throw errors.INTERNAL_SERVER_ERROR({
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

    upload: procedure
      .input(
        z.object({
          files: z
            .array(uploadFileSchema)
            .min(1, "At least one file is required"),
        }),
      )
      .handler(async ({ input, context, errors }) => {
        try {
          if (!context.blob) {
            throw errors.FORBIDDEN({
              message: "Blob storage is not configured",
            });
          }

          const adapter = await createBlobAdapter(context.blob);
          if (!adapter) {
            throw errors.INTERNAL_SERVER_ERROR({
              message: "Failed to initialize blob adapter",
            });
          }

          // Validate files against constraints
          const constraints = adapter.getConstraints();
          if (constraints) {
            // Validate file count
            if (
              constraints.maxFiles &&
              input.files.length > constraints.maxFiles
            ) {
              throw errors.FORBIDDEN({
                message: `Too many files. Maximum allowed: ${constraints.maxFiles}, received: ${input.files.length}`,
              });
            }

            // Validate each file
            for (const file of input.files) {
              const buffer = Buffer.from(file.data, "base64");

              // Validate file size
              if (
                constraints.maxFileSize &&
                buffer.length > constraints.maxFileSize
              ) {
                throw errors.FORBIDDEN({
                  message: `File "${file.name}" size (${buffer.length} bytes) exceeds maximum allowed size of ${constraints.maxFileSize} bytes`,
                });
              }

              // Validate MIME type
              if (constraints.allowedMimeTypes?.length) {
                if (!constraints.allowedMimeTypes.includes(file.type)) {
                  throw errors.FORBIDDEN({
                    message: `File "${file.name}" type "${file.type}" is not allowed. Allowed types: ${constraints.allowedMimeTypes.join(", ")}`,
                  });
                }
              }
            }
          }

          // Upload each file
          const uploadedFiles = await Promise.all(
            input.files.map(async (file) => {
              // Convert base64 to buffer
              const buffer = Buffer.from(file.data, "base64");

              // Generate pathname
              const pathname = `uploads/${Date.now()}-${file.name}`;

              // Upload to blob storage
              const result = await adapter.put(pathname, buffer, {
                contentType: file.type,
                access: "public",
              });

              return {
                name: file.name,
                url: result.url,
                downloadUrl: result.downloadUrl,
                pathname: result.pathname,
                contentType: result.contentType,
                contentDisposition: result.contentDisposition,
              };
            }),
          );

          return {
            success: true,
            files: uploadedFiles,
          };
        } catch (error) {
          console.error("Error uploading files:", error);
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }),
  };
}
