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

import { getBlob } from "@agentstart/blob";
import { z } from "zod";
import { publicProcedure } from "@/api/procedures";
import { handleRouterError } from "@/api/utils/error-handler";

const uploadFileSchema = z.object({
  name: z.string().min(1),
  data: z.string(), // base64 encoded file data
  type: z.string(), // MIME type
});

const blobConstraintsSchema = z.object({
  maxFileSize: z.number().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  maxFiles: z.number().optional(),
  uploadTiming: z.enum(["onSubmit", "immediate"]).optional(),
});

const providerEnum = z.enum(["vercelBlob", "awsS3", "cloudflareR2"]);

const uploadedFileSchema = z.object({
  name: z.string(),
  url: z.string(),
  downloadUrl: z.string().nullable(),
  pathname: z.string(),
  contentType: z.string().nullable(),
  contentDisposition: z.string().nullable(),
});

/**
 * Create blob router with optional custom procedure builder
 */
export function createBlobRouter(procedure = publicProcedure) {
  return {
    getConfig: procedure
      .meta({
        doc: {
          summary: "Inspect blob storage configuration",
          description:
            "Returns whether blob uploads are enabled along with provider-specific constraints so clients can validate files before uploading.",
          examples: [
            {
              title: "Client-side capability check",
              code: "const config = await start.api.blob.getConfig();\nif (!config.enabled) {\n  console.log('Uploads are disabled');\n}",
            },
          ],
        },
      })
      .output(
        z.object({
          enabled: z.boolean(),
          constraints: blobConstraintsSchema.nullable(),
          provider: providerEnum.nullable(),
        }),
      )
      .handler(async ({ context, errors }) => {
        try {
          const adapter = await getBlob(context);
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
          handleRouterError(error, errors);
        }
      }),

    upload: procedure
      .meta({
        doc: {
          summary: "Upload one or more files to the configured blob store",
          description:
            "Validates files against configured constraints and stores them using the active blob adapter, returning public URLs where applicable.",
          examples: [
            {
              title: "Upload a PNG",
              code: "await start.api.blob.upload({ files: [{ name: 'diagram.png', type: 'image/png', data: base64Data }] });",
            },
          ],
        },
      })
      .input(
        z.object({
          files: z
            .array(uploadFileSchema)
            .min(1, "At least one file is required"),
        }),
      )
      .output(
        z.object({
          success: z.boolean(),
          files: z.array(uploadedFileSchema),
        }),
      )
      .handler(async ({ input, context, errors }) => {
        try {
          const adapter = await getBlob(context);
          if (!adapter) {
            throw errors.FORBIDDEN({
              message: "Blob storage is not configured",
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
          handleRouterError(error, errors);
        }
      }),
  };
}
