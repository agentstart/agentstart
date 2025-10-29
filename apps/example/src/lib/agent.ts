/* agent-frontmatter:start
AGENT: Playground agent bootstrap
PURPOSE: Bootstraps the AgentStart runtime with OpenRouter and Drizzle adapters.
USAGE: Import to obtain the agent handler for API routes.
EXPORTS: start
FEATURES:
  - Configures OpenRouter model provider with API key
  - Connects Drizzle adapter to the playground database schema
  - Enables blob storage for file attachments
SEARCHABLE: playground, next, src, lib, agent, bootstrap, openrouter, blob storage
agent-frontmatter:end */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { onStart, onSuccess, os } from "@orpc/server";
import type { BlobOptions } from "agentstart";
import { agentStart } from "agentstart";
import { Agent, agentTools, osTools } from "agentstart/agent";
import { drizzleAdapter } from "agentstart/memory";
import { db } from "@/db";
import * as schema from "@/db/schema";

if (!process.env.MODEL_PROVIDER_API_KEY) {
  throw new Error("Missing MODEL_PROVIDER_API_KEY");
}

// Configure blob storage (optional - only enabled if credentials are provided)
let blobConfig: BlobOptions | undefined;

// Vercel Blob configuration
if (process.env.BLOB_READ_WRITE_TOKEN) {
  blobConfig = {
    provider: {
      provider: "vercelBlob" as const,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
    constraints: {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/markdown",
      ],
      maxFiles: 5,
      uploadTiming: "onSubmit", // Upload when user submits (default)
      // uploadTiming: "immediate", // Uncomment to upload immediately after file selection
    },
  };
}
// Cloudflare R2 configuration
else if (
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_ACCOUNT_ID
) {
  blobConfig = {
    provider: {
      provider: "cloudflareR2" as const,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      bucket: process.env.R2_BUCKET_NAME,
      accountId: process.env.R2_ACCOUNT_ID,
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    },
    constraints: {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/markdown",
      ],
      maxFiles: 5,
      uploadTiming: "onSubmit", // Upload when user submits (default)
      // uploadTiming: "immediate", // Uncomment to upload immediately after file selection
    },
  };
}
// AWS S3 configuration
else if (
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
) {
  blobConfig = {
    provider: {
      provider: "awsS3" as const,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION ?? "us-east-1",
    },
    constraints: {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/markdown",
      ],
      maxFiles: 5,
      uploadTiming: "onSubmit", // Upload when user submits (default)
      // uploadTiming: "immediate", // Uncomment to upload immediately after file selection
    },
  };
}

const openrouter = createOpenRouter({
  apiKey: process.env.MODEL_PROVIDER_API_KEY,
});
const agent = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions: "You are a helpful assistant.",
  tools: {
    ...agentTools,
    ...osTools,
  },
});

// Create custom middleware
const loggingMiddleware = os.middleware(async ({ next }) => {
  console.log("Request started");
  const result = await next();
  console.log("Request completed");
  return result;
});

export const start = agentStart({
  memory: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  blob: blobConfig,
  appName: "example-nextjs",
  agent,
  middleware: [
    loggingMiddleware,
    onStart(() => console.log("Handler starting")),
    onSuccess(() => console.log("Handler succeeded")),
  ],
  advanced: {
    generateTitle: {
      model: openrouter("x-ai/grok-4-fast"),
    },
    generateSuggestions: {
      model: openrouter("x-ai/grok-4-fast"),
      limit: 5,
    },
  },
});
