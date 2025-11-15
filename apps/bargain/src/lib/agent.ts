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
import { generateVerificationCode } from "./tools/generate-verification-code";

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
  model: openrouter("google/gemini-2.0-flash-001"),
  instructions: instructions(
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://kan.guijia.store",
  ),
  tools: {
    generateVerificationCode,
  },
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
    default: openrouter("google/gemini-2.0-flash-001"),
  },
  advanced: {
    generateSuggestions: {
      model: openrouter("google/gemini-2.0-flash-001"),
      limit: 3,
      instructions: `根据刚才讨论的内容生成 ${3} 条相关的后续建议。

指南：
1. 分析助手刚才展示/讨论的内容（数据、分析、见解）
2. 建议合乎逻辑的下一步，基于这个具体回复展开
3. 保持建议极简（理想 2-3 个字，最多 5 个字）
4. 适当给出砍价相关词汇
5. 使建议针对具体情境，而非泛泛而谈
6. 关注能提供价值的可用功能
7. 如果没有调用过 generateVerificationCode tool 并且已经有了价格，那么第一个 suggestion 必须是"上订购链接"之类的词汇

好的建议应该：
- 针对刚才讨论的内容
- 可使用现有功能执行
- 简洁清晰（2-3 个字）
- 自然的下一步，而非重复
- 使用简体中文`,
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
