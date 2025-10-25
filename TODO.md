## Upload Service Integration

- Design `UploadOptions` (mirrors memory adapter shape) and add `uploads?: UploadOptions` to `packages/agentstart/src/types/options.ts`.
- Define provider unions for `vercelBlob`, `awsS3`, and `cloudflareR2` with required credentials, bucket metadata, and endpoint overrides.
- Describe shared constraints (`maxFileSize`, `allowedMimeTypes`, `maxFiles`) and surface them through `AgentStart` runtime context for UI consumption.
- Introduce an upload adapter interface that supplies helpers for signed URLs and direct put operations, similar to how memory adapters abstract persistence.
- Implement provider-specific adapters in `packages/agentstart/src/uploads/*` with normalized responses (`url`, `pathname`, `contentType`, `size`).
- Expose framework-agnostic route helpers (e.g., `createUploadRoute`) so Next.js/Express templates can mount upload endpoints without bespoke code.
- Update `apps/example` to consume the new upload helpers end-to-end (route handler, client hook, message submission, queue states).
- Document environment variables and configuration examples for every provider in `README` + template docs; include migration notes for existing deployments.
- Add integration tests or mocked suites covering each provider branch and constraint failure paths (oversized file, disallowed type, missing auth).
