/* agent-frontmatter:start
AGENT: Playground agent bootstrap
PURPOSE: Bootstraps the AgentStart runtime with OpenRouter and Drizzle adapters.
USAGE: Import to obtain the agent handler for API routes.
EXPORTS: start
FEATURES:
  - Configures OpenRouter model provider with API key
  - Connects Drizzle adapter to the playground database schema
  - Enables blob storage for file attachments using adapter pattern
SEARCHABLE: playground, next, src, lib, agent, bootstrap, openrouter, blob storage
agent-frontmatter:end */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { onStart, onSuccess, os } from "@orpc/server";
import type { Blob, SecondaryMemoryAdapter } from "agentstart";
import { agentStart } from "agentstart";
import { Agent, agentTools, osTools } from "agentstart/agent";
import {
  r2BlobAdapter,
  s3BlobAdapter,
  vercelBlobAdapter,
} from "agentstart/blob";
import {
  drizzleMemoryAdapter,
  inMemorySecondaryMemoryAdapter,
  redisSecondaryMemoryAdapter,
} from "agentstart/memory";
import { createAgentPrompt } from "agentstart/prompts";
import { e2bSandboxAdapter, nodeSandboxAdapter } from "agentstart/sandbox";
import { db } from "@/db";
import * as schema from "@/db/schema";

if (!process.env.MODEL_PROVIDER_API_KEY) {
  throw new Error("Missing MODEL_PROVIDER_API_KEY");
}

// Configure blob storage (optional - only enabled if credentials are provided)
let blobAdapter: Blob | undefined;

// Vercel Blob configuration
if (process.env.BLOB_READ_WRITE_TOKEN) {
  blobAdapter = vercelBlobAdapter({
    token: process.env.BLOB_READ_WRITE_TOKEN,
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
  });
}
// Cloudflare R2 configuration
else if (
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_ACCOUNT_ID
) {
  blobAdapter = r2BlobAdapter({
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    bucket: process.env.R2_BUCKET_NAME,
    accountId: process.env.R2_ACCOUNT_ID,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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
      uploadTiming: "onSubmit",
    },
  });
}
// AWS S3 configuration
else if (
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
) {
  blobAdapter = s3BlobAdapter({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION ?? "us-east-1",
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
      uploadTiming: "onSubmit",
    },
  });
}

// Configure secondary memory (used for E2B sandbox heartbeats and lifecycle tracking)
let secondaryMemory: SecondaryMemoryAdapter;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  // Redis adapter for production (persistent, scalable)
  secondaryMemory = redisSecondaryMemoryAdapter({
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
  });
} else {
  // In-memory adapter for development (data lost on process restart)
  console.warn(
    "Using in-memory secondary memory adapter. Data will be lost on restart. Configure REDIS_URL for production.",
  );
  secondaryMemory = inMemorySecondaryMemoryAdapter();
}

const openrouter = createOpenRouter({
  apiKey: process.env.MODEL_PROVIDER_API_KEY,
});

const instructions = createAgentPrompt({
  scenario: "developer",
  focus: "Full-stack SaaS applications with Next.js and TypeScript",
  runtime: "Node.js 20",
  languages: ["TypeScript"],
  frameworks: ["Next.js", "React", "Prisma"],
});

const agent = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions,
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

// Configure sandbox adapter based on E2B_API_KEY availability
const sandboxAdapter = process.env.E2B_API_KEY
  ? e2bSandboxAdapter({ apiKey: process.env.E2B_API_KEY })
  : nodeSandboxAdapter();

export const start = agentStart({
  sandbox: sandboxAdapter,
  memory: drizzleMemoryAdapter(db, {
    provider: "postgresql",
    schema,
  }),
  secondaryMemory: secondaryMemory,
  blob: blobAdapter,
  appName: "example-nextjs",
  agent,
  models: {
    default: openrouter("x-ai/grok-4-fast"),
    available: [
      openrouter("x-ai/grok-4-fast"),
      openrouter("anthropic/claude-sonnet-4.5"),
      openrouter("openai/gpt-5"),
      openrouter("google/gemini-2.0-flash-001"),
    ],
  },
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
