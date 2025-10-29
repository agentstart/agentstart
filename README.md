# Agent Start – Agent Framework Overview

## Mission

Deliver a batteries-included framework that lets developers assemble production-ready agents with minimal ceremony.

## Quick Setup Workflow

1. Install the core package: `npm install agentstart` (or `pnpm add agentstart`).
2. Provide runtime credentials: define `E2B_API_KEY` and `MODEL_PROVIDER_API_KEY` in your environment.
3. Author `agent.ts` to select adapters, tools, memory stores, and templates.
4. Generate backing tables: `npx agentstart/cli generate`.
5. Mount the handler inside your API surface (e.g. Next.js route, Express handler, or serverless function).

## System Architecture

```
Agent Class
├─ Prompts (mission, summary, system variants)
├─ Tools
│   ├─ Agent tools (sandbox, evaluator, knowledge retrieval)
│   └─ Document tools (upload, index, embeddings)
├─ Memory
│   ├─ Mission storage
│   ├─ Summary storage
│   ├─ Task storage
│   └─ Knowledge base (vector + SQL)
├─ Components (UI primitives, AI blocks)
└─ Templates (API handlers, SDK adapters, runners)
```

The agent class orchestrates prompts, tool execution, and memory updates. Tools are registered via configuration and dispatched using a shared executor. Memory abstractions provide persistent context that survives across interactions.

## Core Concepts

### Agent Class

- Central orchestrator that binds prompts, tools, memory stores, and renderable components.
- Maintains conversation state, delegates tool calls, and emits events for UI layers.
- Exposes life-cycle hooks for initialization, message handling, and teardown.

### Prompts

- **Mission prompt**: defines the agent’s role, guardrails, and high-level objectives.
- **Summary prompt**: condenses long conversations into a rolling digest.
- **System prompt variants**: specialization layers for different adapters (CLI, thread, workflow).
- Prompts are versioned and selectable per environment; store them alongside the config.

### Tools

- **Agent tools**: built-in capabilities (`run_code`, `sandbox_browser`, `search_sources`, `shell_exec`).
- **Document tools**: ingest external files, create embeddings, and expose retrieval actions.
- Tools share a base interface: `name`, `description`, `schema`, and `handler`.
- Registration occurs inside `agent.ts`. Use `const tools = [...agentTools, ...documentTools];`

### Memory

- **Message storage**: persists raw turns for auditing and replay.
- **Summary storage**: incremental summary updated after each cycle.
- **Task storage**: queue of outstanding tasks and sub-goals.
- **Knowledge storage**: semantic search backed by embeddings + relational metadata.
- Memory adapters implement `get`, `append`, `summarize`, and `clear` contracts so they can be swapped (PostgreSQL, Redis, in-memory, S3).

### Blob Storage

Blob storage enables agents to accept multimodal inputs by persisting user file uploads to cloud storage and surfacing normalized metadata to downstream tools and memory systems.

**Supported Providers:**
- **Vercel Blob**: Serverless blob storage with automatic global CDN distribution
- **AWS S3**: Industry-standard object storage with flexible access controls
- **Cloudflare R2**: S3-compatible storage with zero egress fees

**Configuration Example:**

```typescript
import { agentStart } from "agentstart";
import type { BlobOptions } from "agentstart/blob";

// Configure Vercel Blob
const blobConfig: BlobOptions = {
  provider: {
    provider: "vercelBlob",
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
  },
};

export const start = agentStart({
  memory: /* ... */,
  blob: blobConfig,
  agent: /* ... */,
});
```

**AWS S3 Configuration:**

```typescript
const blobConfig: BlobOptions = {
  provider: {
    provider: "awsS3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    bucket: process.env.AWS_S3_BUCKET!,
    region: "us-east-1",
  },
  constraints: {
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: ["image/*", "application/pdf"],
  },
};
```

**Cloudflare R2 Configuration:**

```typescript
const blobConfig: BlobOptions = {
  provider: {
    provider: "cloudflareR2",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    bucket: process.env.R2_BUCKET!,
    accountId: process.env.R2_ACCOUNT_ID,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  },
  constraints: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
  },
};
```

**Environment Variables:**

```bash
# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# AWS S3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=my-agent-uploads

# Cloudflare R2
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=my-r2-bucket
R2_ACCOUNT_ID=...
```

**Client Usage:**

The `useBlobAttachments` hook handles client-side validation and upload:

```typescript
import { useBlobAttachments } from "agentstart/client";

function MyComponent() {
  const { uploadMutation, validateFiles, isEnabled } = useBlobAttachments(client);

  const handleFileSelect = async (files: File[]) => {
    const errors = validateFiles(files);
    if (errors.length > 0) {
      console.error("Validation errors:", errors);
      return;
    }

    const uploadedFiles = await uploadMutation.mutateAsync(files);
    // Use uploadedFiles in message attachments
  };
}
```

Blob storage is **optional** and will be disabled if no provider configuration is supplied. When disabled, the `blob.getConfig` API returns `{ enabled: false }` and file uploads will not be processed.

### Components

- UI blocks consumed by dashboards or embed surfaces.
- `AIElements`: prebuilt thread widgets and inspector panes.
- `Block`: low-level layout primitives for composing custom experiences.
- Components receive streams/events from the agent class; keep them presentation-only.

### Templates

- Starter implementations for popular runtimes:
  - `app` – Next.js / React server actions
  - `handlebars` – static docs with live agent slots
  - `invoke-sdk` – standalone runner using the SDK
  - `hono` – edge-friendly HTTP handler
  - `express` – Node.js REST integration
- Each template wires prompts, memory, and tools according to best practices.

## Metadata Comment Standard

**IMPORTANT: Every new TypeScript or JavaScript file MUST start with an `agent-frontmatter` block.** This is a mandatory requirement for all code files in the project.

All TypeScript and JavaScript entry points should start with the sentinel-wrapped metadata block so agents and scripts can identify file purpose:

```ts
/* agent-frontmatter:start
AGENT: Agent runtime handler
PURPOSE: Route incoming messages through the agent class pipeline
USAGE: Import and mount inside the chosen template handler
EXPORTS: createAgentHandler
FEATURES:
  - Validates config
  - Streams token events
  - Dispatches tool executions
SEARCHABLE: agent handler, pipeline, runtime
agent-frontmatter:end */
```

Keep field names and ordering consistent across files. Expand `FEATURES` or `EXPORTS` only when relevant.

### Code Navigation & Discovery

Almost every file includes an `agent-frontmatter` block with functional descriptions and searchable keywords. When you need to find relevant code:

1. Use the Grep tool to search for keywords in the `SEARCHABLE` field (e.g., `grep "agent handler" --output_mode=files_with_matches`)
2. Once you locate candidate files, read the `agent-frontmatter` block at the top to understand the file's purpose, exports, and features
3. This approach helps you navigate the codebase efficiently without reading every file

The `SEARCHABLE` field should contain comma-separated keywords that describe the file's domain, functionality, and common use cases.

## Environment & Secrets

- `E2B_API_KEY`: access to sandboxed code execution.
- `MODEL_PROVIDER_API_KEY`: large language model routing.
- `DATABASE_URL`: database credentials for memory adapters (PostgreSQL, MySQL, etc.).
- **Blob Storage** (optional):
  - `BLOB_READ_WRITE_TOKEN`: Vercel Blob authentication token
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`: AWS S3 credentials
  - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`: Cloudflare R2 credentials
- Store secrets in `.env` (not committed) and surface them in deployment platforms.

## Development Workflow

1. Update prompts or tool definitions.
2. Run `npx agentstart/cli generate` after schema changes to keep memory tables aligned.
3. Use the template-specific dev server (`npm run dev:express`, `npm run dev:next`) to test interactions.
4. Verify memory adapters with integration tests (see `/tooling/testing`).
5. **Always run `bun run lint` and `bun run typecheck` after completing changes** to ensure code quality and type safety before committing.
6. Default test command: use `bun run test` instead of invoking `bun test` directly, so workspace scripts stay consistent with CI.
7. Unit tests are optional overall, but add or update them when you touch stability-critical paths (adapters, persistence flows, core runtime hooks) so regressions surface early.
8. Reference packages managed by the root `catalog` with the plain `catalog:` alias; never install those dependencies with explicit versions (e.g. avoid `npm install react@...`) so updates stay centralized.
9. Treat every `tsconfig.json` as locked configuration—do not modify these files during regular development.

## Code Style Guardrails

- Prefer precise TypeScript types and `unknown` over `any`. Unless a spec explicitly allows it, `any` is off limits.
- When a function needs more than two parameters, wrap them in a single options object so call sites remain readable and extensible.
- Do not introduce redundant wrapper callbacks (e.g. `const handleX = useCallback(() => doX())`); invoke the underlying function directly to keep the code concise.

## Roadmap Snapshot

- ✅ Agent class core
- ✅ Agent tools (sandbox, documents)
- ✅ Memory adapters (PostgreSQL baseline)
- ⏳ Additional templates (Fastify, Cloudflare Workers)
- ⏳ Analytics + observability hooks
- ⏳ Visual builder for prompt + tool composition
