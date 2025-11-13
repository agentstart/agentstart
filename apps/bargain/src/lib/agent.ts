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
import type { Blob, SecondaryMemoryAdapter } from "agentstart";
import { agentStart } from "agentstart";
import { Agent } from "agentstart/agent";
import { r2BlobAdapter, s3BlobAdapter } from "agentstart/blob/s3";
import { vercelBlobAdapter } from "agentstart/blob/vercel";
import { drizzleMemoryAdapter } from "agentstart/memory/drizzle";
import { redisSecondaryMemoryAdapter } from "agentstart/memory/redis";
import { inMemorySecondaryMemoryAdapter } from "agentstart/memory/secondary-in-memory";
import { db } from "@/db";
import * as schema from "@/db/schema";
import instructions from "./instructions";

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

const agent = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions,
});

export const start = agentStart({
  memory: drizzleMemoryAdapter(db, {
    provider: "postgresql",
    schema,
  }),
  secondaryMemory: secondaryMemory,
  blob: blobAdapter,
  appName: "guijia",
  logo: {
    src: "/logo.jpg",
    alt: "归家十二分",
    width: 48,
    height: 48,
  },
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
  advanced: {
    generateTitle: {
      model: openrouter("x-ai/grok-4-fast"),
    },
    generateSuggestions: {
      model: openrouter("x-ai/grok-4-fast"),
      limit: 5,
    },
  },
  welcome: {
    description:
      "嘿,想过我这关?我可是如假包换的归家砍价守门员!🏆本守门员今天状态正佳,只会对最会聊天的那位网开一面~",
    suggestions: [
      "如果我们能成为朋友，价格是不是会好商量？",
      "我肯定会在朋友圈里狠狠夸你！所以,先给点动力？",
      "给个诚意价呗，不然我可就走啦～",
    ],
  },
});
