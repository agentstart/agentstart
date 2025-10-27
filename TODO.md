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

---

## Tool Schema Alignment with Claude Code SDK Reference

> Goal: Align AgentStart tool definitions with Claude Code SDK reference to ensure compatibility, consistent naming conventions, and feature parity.

### Analysis Summary

Compared AgentStart tool implementations (`packages/agentstart/src/agent/tools/`) with the [Claude Code TypeScript SDK Tool Reference](https://docs.claude.com/en/api/agent-sdk/typescript#tool-input-types). Key findings below:

### 1. Naming Convention Differences

**Current State:**
- AgentStart uses **camelCase** for all parameters: `filePath`, `oldString`, `newString`, `replaceAll`
- SDK Reference uses **snake_case** for all parameters: `file_path`, `old_string`, `new_string`, `replace_all`

**Impact:**
- Different naming conventions may cause confusion when developers reference SDK docs
- Type definitions won't match SDK expectations if users try to integrate with SDK-compatible tooling

**Recommendation:**
- [ ] Decide on standard: Either adopt SDK's snake_case or document the camelCase deviation clearly
- [ ] If keeping camelCase, add migration guide/compatibility layer for SDK users
- [ ] Update CLAUDE.md to explicitly mention naming convention differences

### 2. Missing Tools (SDK → AgentStart)

The following tools exist in Claude Code SDK but are missing in AgentStart:

#### High Priority (Core Functionality)
- [ ] **Task** - Subagent delegation for complex multi-step tasks
  - SDK: Launches specialized agents with scoped tools/prompts
  - Impact: Cannot delegate complex workflows to specialized subagents
  - Input: `{ description, prompt, subagent_type }`
  - Output: `{ result, usage, total_cost_usd, duration_ms }`

- [ ] **BashOutput** - Monitor background shell processes
  - SDK: Retrieves incremental output from running background shells
  - Impact: Cannot monitor long-running processes (builds, tests, servers)
  - Input: `{ bash_id, filter? }`
  - Output: `{ output, status, exitCode? }`

- [ ] **KillBash** - Terminate background processes
  - SDK: Kills running background shells by ID
  - Impact: Cannot clean up stuck/unwanted background processes
  - Input: `{ shell_id }`
  - Output: `{ message, shell_id }`

#### Medium Priority (Enhanced Functionality)
- [ ] **NotebookEdit** - Edit Jupyter notebook cells
  - SDK: Replace/insert/delete cells in `.ipynb` files
  - Impact: Cannot modify Jupyter notebooks programmatically
  - Input: `{ notebook_path, cell_id?, new_source, cell_type?, edit_mode? }`
  - Output: `{ message, edit_type, cell_id?, total_cells }`

- [ ] **WebFetch** - Fetch and analyze web content with AI
  - SDK: Downloads URL, converts to markdown, processes with prompt
  - Impact: Cannot retrieve and analyze external web content
  - Input: `{ url, prompt }`
  - Output: `{ response, url, final_url?, status_code? }`

- [ ] **WebSearch** - Search the web
  - SDK: Returns formatted search results with domain filtering
  - Impact: Cannot search for current information or documentation
  - Input: `{ query, allowed_domains?, blocked_domains? }`
  - Output: `{ results, total_results, query }`

#### Lower Priority (Planning/MCP)
- [ ] **ExitPlanMode** - Exit planning mode with user approval
  - SDK: Prompts user to approve plan before execution
  - Input: `{ plan }`
  - Output: `{ message, approved? }`

- [ ] **ListMcpResources** - List available MCP resources
  - SDK: Discovers resources from connected MCP servers
  - Input: `{ server? }`
  - Output: `{ resources, total }`

- [ ] **ReadMcpResource** - Read specific MCP resource
  - SDK: Fetches resource contents from MCP server
  - Input: `{ server, uri }`
  - Output: `{ contents, server }`

### 3. Extra Tools (AgentStart → SDK)

AgentStart has these tools not in SDK reference:

- **ls** - Directory listing tool
  - Input: `{ path, ignore? }`
  - Status: ✅ Keep (useful for file exploration)

- **web-scrape** - Web scraping with screenshot
  - Input: `{ url, waitTime? }`
  - Output: Includes screenshot, markdown, colors, media map
  - Status: ✅ Keep (richer than SDK's WebFetch)

- **screenshot** - Sandbox preview capture
  - Input: `{ waitTime?, viewportWidth?, viewportHeight?, theme? }`
  - Status: ✅ Keep (sandbox-specific feature)

### 4. Schema Differences by Tool

#### Bash Tool
**SDK:**
```typescript
interface BashInput {
  command: string;
  timeout?: number;
  description?: string;
  run_in_background?: boolean; // ❌ Missing in AgentStart
}

interface BashOutput {
  output: string;           // Combined stdout+stderr
  exitCode: number;
  killed?: boolean;
  shellId?: string;         // For background processes
}
```

**AgentStart:**
```typescript
interface BashInput {
  command: string;
  timeout?: number;
  description?: string;
  // ❌ No run_in_background support
}

interface BashOutput {
  status: "pending" | "done" | "error";
  prompt: string;           // Human-readable summary
  metadata?: {
    stdout?: string;        // Separate stdout/stderr
    stderr?: string;
    exitCode?: number;
    duration?: number;
    commitHash?: string;    // ✅ Git integration
  };
  error?: { message: string };
}
```

**Recommendations:**
- [ ] Add `run_in_background` parameter to bash tool
- [ ] Implement background shell tracking with unique IDs
- [ ] Add BashOutput and KillBash tools for background process management
- [ ] Keep separate stdout/stderr in metadata (more detailed than SDK)
- [ ] Keep git commit integration (AgentStart feature)

#### Read Tool
**SDK:**
```typescript
interface ReadInput {
  file_path: string;        // ❌ snake_case
  offset?: number;
  limit?: number;
}
```

**AgentStart:**
```typescript
interface ReadInput {
  filePath: string;         // ✅ camelCase
  offset?: number;
  limit?: number;
}
```

**Recommendation:**
- [ ] Align parameter naming with decision in #1

#### Update/Edit Tool
**SDK (Edit):**
```typescript
interface EditInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}
```

**AgentStart (update):**
```typescript
interface UpdateInput {
  filePath: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}
```

**Recommendation:**
- [ ] Consider renaming "update" to "Edit" for SDK alignment
- [ ] Or keep "update" and document clearly in API reference

#### TodoWrite Tool
**SDK:**
```typescript
interface TodoWriteInput {
  todos: Array<{
    content: string;
    status: "pending" | "in_progress" | "completed";
    activeForm: string;      // ❌ Missing in AgentStart schema
  }>;
}
```

**AgentStart:**
```typescript
interface TodoWriteInput {
  todos: Array<{
    id?: string;             // ✅ Auto-generated if missing
    content: string;
    status: "pending" | "inProgress" | "completed" | "cancelled";
    priority: "high" | "medium" | "low"; // ✅ Extra field
  }>;
}
```

**Recommendations:**
- [ ] Add `activeForm` field to schema (present continuous form, e.g., "Running tests")
- [ ] Update todo-write description to document activeForm requirement
- [ ] Keep `priority` field (useful enhancement)
- [ ] Keep `cancelled` status (useful enhancement)
- [ ] Align status values: SDK uses `in_progress`, AgentStart uses `inProgress`

### 5. Output Structure Philosophy

**SDK Approach:**
- Direct, tool-specific output objects
- Each tool has unique output shape
- Simple error handling (throw exceptions)

**AgentStart Approach:**
- Consistent wrapper: `{ status, prompt, metadata, error }`
- Generator-based streaming (`async *execute`)
- Rich error objects with context
- Git commit integration in metadata

**Recommendation:**
- [ ] Keep AgentStart's streaming generator pattern (superior UX)
- [ ] Keep consistent wrapper for UI integration
- [ ] Consider exposing SDK-compatible output adapters for migration

### 6. Implementation Priorities

#### Phase 1: Critical Compatibility (Week 1-2)
- [ ] Add `activeForm` field to TodoWrite schema
- [ ] Implement background bash execution (`run_in_background` parameter)
- [ ] Add BashOutput tool for monitoring background processes
- [ ] Add KillBash tool for terminating background processes
- [ ] Decide on and document naming convention (snake_case vs camelCase)

#### Phase 2: Feature Parity (Week 3-4)
- [ ] Implement Task tool for subagent delegation
- [ ] Add NotebookEdit for Jupyter notebook manipulation
- [ ] Add WebFetch tool (or enhance existing web-scrape)
- [ ] Add WebSearch tool with domain filtering

#### Phase 3: MCP Integration (Week 5-6)
- [ ] Add ListMcpResources tool
- [ ] Add ReadMcpResource tool
- [ ] Add ExitPlanMode tool (if planning mode is implemented)

#### Phase 4: Documentation & Testing
- [ ] Create comprehensive tool reference docs matching SDK format
- [ ] Add migration guide for SDK users
- [ ] Write integration tests for all new tools
- [ ] Update CLAUDE.md with tool usage guidelines
- [ ] Run `bun run lint`, `bun run typecheck`, `bun run test`

### 7. Breaking Changes to Consider

If adopting SDK naming conventions:
- [ ] Migration script for existing codebases using camelCase
- [ ] Deprecation warnings for old parameter names
- [ ] Version bump to indicate breaking changes
- [ ] Update all examples and templates

### 8. Non-Breaking Enhancements

Can be added without breaking existing code:
- [ ] Add optional SDK-compatible aliases (e.g., accept both `file_path` and `filePath`)
- [ ] Export SDK-compatible type definitions alongside existing types
- [ ] Add compatibility layer in tool registration
