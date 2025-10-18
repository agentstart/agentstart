# Agent Start – Agent Framework Overview

## Mission

Deliver a batteries-included framework that lets developers assemble production-ready agents with minimal ceremony.

## Quick Setup Workflow

1. Install the core package: `npm install agentstart` (or `pnpm add agentstart`).
2. Provide runtime credentials: define `E2B_API_KEY` and `MODEL_PROVIDER_API_KEY` in your environment.
3. Author `agentstart.config.ts` to select adapters, tools, memory stores, and templates.
4. Generate backing tables: `npx agentstart/cli generate`.
5. Mount the handler inside your API surface (e.g. Next.js route, Express handler, or serverless function).

## System Architecture

```
Agent Class
├─ Prompts (mission, summary, system variants)
├─ Tools
│   ├─ Inner tools (sandbox, evaluator, knowledge retrieval)
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

- **Inner tools**: built-in capabilities (`run_code`, `sandbox_browser`, `search_sources`, `shell_exec`).
- **Document tools**: ingest external files, create embeddings, and expose retrieval actions.
- Tools share a base interface: `name`, `description`, `schema`, and `handler`.
- Registration occurs inside `agentstart.config.ts`. Use `const tools = [...innerTools, ...documentTools];`

### Memory

- **Message storage**: persists raw turns for auditing and replay.
- **Summary storage**: incremental summary updated after each cycle.
- **Task storage**: queue of outstanding tasks and sub-goals.
- **Knowledge storage**: semantic search backed by embeddings + relational metadata.
- Memory adapters implement `get`, `append`, `summarize`, and `clear` contracts so they can be swapped (PostgreSQL, Redis, in-memory, S3).

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

## Configuration (`agentstart.config.ts`)

- Export a default config object that declares:
  - `prompts`: mission + summary definitions.
  - `tools`: arrays of inner/document tools.
  - `memory`: adapters for message, summary, task, and knowledge storage.
  - `components`: UI bundles to expose.
  - `templates`: enabled templates and route bindings.
- Example skeleton:

```ts
import { innerTools, documentTools } from "agentstart/tools";
import { postgresMemory } from "agentstart/memory/postgres";

export default agentStartConfig({
  prompts: {
    mission: "./prompts/mission.md",
    summary: "./prompts/summary.md",
  },
  tools: [...innerTools(), ...documentTools()],
  memory: postgresMemory(),
  components: ["AIElements", "Block"],
  templates: ["express"],
});
```

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
- Optional: database credentials for the memory adapters (`DATABASE_URL`), vector store keys, storage bucket secrets.
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

## Roadmap Snapshot

- ✅ Agent class core
- ✅ Inner tools (sandbox, documents)
- ✅ Memory adapters (PostgreSQL baseline)
- ⏳ Additional templates (Fastify, Cloudflare Workers)
- ⏳ Analytics + observability hooks
- ⏳ Visual builder for prompt + tool composition
