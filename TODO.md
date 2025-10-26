## Blob Service Integration

> Goal: enable AgentStart deployments to support multimodal conversations by accepting user file uploads, persisting them in a pluggable storage backend, and exposing normalized metadata to downstream tools, memory, and UI surfaces.

### Product Objective

Blob storage unlocks multimodal agents by guaranteeing that any file a user uploads is validated, persisted, and re-delivered with consistent metadata. Every touchpoint—tools, memory pipelines, UI layers, and downstream automations—should receive attachments in the same normalized shape so conversational context, auditing, and replay continue to work even after the original upload session ends.

- [x] Define `BlobOptions` (mirroring the memory adapter ergonomics) and add `blob?: BlobOptions` to `packages/agentstart/src/types/options.ts`, then thread the field through `packages/agentstart/src/api/context.ts` so request handlers can access blob storage configuration.
- [x] Model provider unions for `vercelBlob`, `awsS3`, and `cloudflareR2`, capturing credentials, bucket metadata, and optional endpoint overrides for each storage service using a unified Vercel Blob-aligned API contract.
- [x] Capture shared constraints (`maxFileSize`, `allowedMimeTypes`, `maxFiles`) inside the options shape and expose them on the runtime context for UI and validator consumption.
- [x] Introduce a blob adapter contract that mirrors the @vercel/blob server SDK (put, head, list, multipart helpers) under `packages/agentstart/src/types/blob-adapter.ts`, including constraint accessors.
- [x] Implement provider-specific adapters in `packages/agentstart/src/blob/providers/*` for Vercel Blob and S3-compatible backends using the unified API surface.
- [x] Add a factory/registry (`createBlobAdapter`) so routers and helpers can resolve the appropriate adapter from context without provider-specific branching.
- [x] Ship blob upload functionality via ORPC procedures (`blob.getConfig`, `blob.upload`) - HTTP utilities removed in favor of ORPC-only architecture.
- [x] Extend the ORPC surface with a `blob.getConfig` procedure so clients can fetch constraints and capabilities before attempting an upload.
- [x] Update the shared PromptInput in `packages/components/src/registry/agentstart/prompt-input.tsx` to call a new `useBlobAttachments` hook that enforces constraints and replaces queued files with resolved Blob metadata.
- [x] Wire `apps/example` to demonstrate the flow: configure `blob` in `src/lib/agent.ts`, and verify file upload through the ORPC blob procedures.
- [x] Document provider environment variables and configuration examples in the root `README.md` plus template docs, including migration guidance for existing deployments.
- [x] Add server-side constraints validation in `blob.upload` procedure to prevent malicious clients from bypassing client-side validation (validates file size, MIME type, and file count).
- [x] Implement `uploadTiming` configuration option allowing users to choose between "onSubmit" (default) and "immediate" upload strategies.
- [x] Fix image upload issue by properly handling `data:` URLs in addition to `blob:` URLs when reconstructing File objects from FileUIPart.
- [x] Normalize client attachment handling: `useBlobAttachments` now converts `FileUIPart` blobs into `File` instances, merges upload responses back into the original array, and exposes a unified `File | FileUIPart` surface for callers.
- [x] Add integration or mocked tests covering each provider branch and constraint failure paths (oversized file, disallowed type, missing auth), running `bun run lint`, `bun run typecheck`, and `bun run test` as validation steps once implementation lands.
- [x] Propagate the new attachment union type (`FileList | (File | FileUIPart)[]`) across all consumers (`prompt-input`, queue helpers, store) and ensure UI loading states (e.g. `SendButton`) reflect blob upload progress.
