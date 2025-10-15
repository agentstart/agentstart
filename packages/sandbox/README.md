# Sandbox Package

Provides unified sandbox management for both E2B and Node.js environments with automatic resource optimization and heartbeat management.

## Architecture Overview

```
Agent Instance (per project/session)
  └── SandboxManager (single instance)
       ├── FileSystem API
       ├── Bash API
       ├── Git API
       └── Dev API (all with auto-keepAlive)
```

## Core Concepts

### Single Sandbox Per Project

**IMPORTANT**: Each Agent/Project should maintain ONE `SandboxManager` instance that is shared across all tools. This ensures:
- No resource waste from duplicate sandboxes
- Consistent state across tool operations
- Automatic heartbeat management
- Proper lifecycle tracking

### Auto-KeepAlive

All tool operations (fs, bash, git, dev) automatically refresh the sandbox heartbeat, preventing premature auto-stop without requiring manual `keepAlive()` calls.

## Usage

### E2B Sandbox

```typescript
import { SandboxManager } from '@agent-stack/sandbox/adapter/e2b';
import { createKV } from '@agent-stack/infra';

// In your Agent class initialization
class Agent {
  private sandboxManager: SandboxManager;

  async initialize(config: AgentConfig) {
    // Create or reconnect to existing sandbox
    this.sandboxManager = await SandboxManager.connectOrCreate({
      sandboxId: config.cachedSandboxId, // from previous session
      kv: createKV(),
      githubToken: config.githubToken,
      timeout: 300000, // 5 minutes
      autoStopDelay: 60000 // 1 minute of inactivity
    });

    // Initialize tools and inject sandbox
    this.tools = this.initializeTools({
      sandbox: this.sandboxManager
    });
  }

  private initializeTools(deps: { sandbox: SandboxManager }) {
    return [
      new CodeExecutorTool(deps),
      new FileManipulationTool(deps),
      new GitOperationsTool(deps)
    ];
  }

  async cleanup() {
    await this.sandboxManager.dispose();
  }

  // Provide sandboxId for next session
  getSandboxId(): string | null {
    return this.sandboxManager.getSandboxId();
  }
}
```

### Tool Implementation Example

```typescript
import type { SandboxManager } from '@agent-stack/sandbox';

interface ToolDependencies {
  sandbox: SandboxManager;
}

class CodeExecutorTool {
  constructor(private deps: ToolDependencies) {}

  async execute(code: string): Promise<string> {
    // Use sandbox APIs directly - keepAlive is automatic
    const result = await this.deps.sandbox.bash.$`node -e ${code}`;
    return result.stdout;
  }
}

class FileManipulationTool {
  constructor(private deps: ToolDependencies) {}

  async readFile(path: string): Promise<string> {
    // Auto-refreshes heartbeat on each operation
    return await this.deps.sandbox.fs.readFile(path, { encoding: 'utf8' });
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.deps.sandbox.fs.writeFile(path, content, { recursive: true });
  }
}

class GitOperationsTool {
  constructor(private deps: ToolDependencies) {}

  async commit(message: string): Promise<void> {
    const sandbox = this.deps.sandbox;

    // All operations auto-refresh heartbeat
    await sandbox.git.add('.');
    const result = await sandbox.git.commit({ message });

    if (!result.success) {
      throw new Error(result.error || 'Commit failed');
    }
  }
}
```

### Node.js Sandbox

```typescript
import { SandboxManager } from '@agent-stack/sandbox/adapter/nodejs';

// Similar API, but runs in local process
const sandboxManager = await SandboxManager.connectOrCreate(
  'project-id',
  { workspacePath: '/path/to/project' }
);

// Use the same way as E2B
await sandboxManager.bash.$`npm test`;
const files = await sandboxManager.fs.readdir('src', { recursive: true });
await sandboxManager.dispose();
```

## Factory Methods

### `connectOrCreate(options)` - Recommended

Connect to an existing sandbox if available, or create a new one.

**When to use**: Most use cases. This is the default choice for production agents.

```typescript
const manager = await SandboxManager.connectOrCreate({
  sandboxId: previousSandboxId, // optional
  kv: kvClient,
  timeout: 300000
});
```

### `forceCreate(options)` - Explicit New Sandbox

Always create a brand new sandbox, regardless of existing ones.

**When to use**: When you explicitly need a fresh environment (e.g., testing, one-off tasks).

```typescript
const manager = await SandboxManager.forceCreate({
  kv: kvClient,
  timeout: 300000
});
```

## Configuration Options

```typescript
interface SandboxConfig {
  // Required for E2B
  kv: KV;

  // Optional sandbox ID to reconnect
  sandboxId?: string;

  // Local workspace path (Node.js only)
  workspacePath?: string;

  // Sandbox timeout in milliseconds
  timeout?: number;

  // Auto-stop after inactivity (E2B only)
  autoStopDelay?: number;

  // Maximum sandbox lifetime before forced recreation
  maxLifetime?: number;

  // Ports to expose (E2B only)
  ports?: number[];

  // Runtime environment (E2B only)
  runtime?: string;

  // CPU resources (E2B only)
  resources?: {
    vcpus?: number; // cSpell:ignore vcpus
  };
}
```

## Status Monitoring

```typescript
// Check sandbox status
const status = await sandboxManager.getStatus();
console.log({
  active: status.active,
  sandboxId: status.sandboxId,
  uptime: status.uptime,
  lastActivity: status.lastActivity,
  reusable: status.reusable
});

// Manual heartbeat refresh (usually not needed)
await sandboxManager.keepAlive();
```

## Anti-Patterns to Avoid

### ❌ Creating Multiple Managers Per Project

```typescript
// BAD: Each tool creates its own manager
class MyTool {
  async execute() {
    const sandbox = await SandboxManager.connectOrCreate({ kv });
    await sandbox.bash.$`npm test`;
    // Multiple manager instances = wasted resources
  }
}
```

### ❌ Not Reusing Sandbox ID

```typescript
// BAD: Always creating new sandboxes
async function runAgent() {
  const sandbox = await SandboxManager.forceCreate({ kv });
  // Previous sandbox wasted
}
```

### ✅ Correct Pattern

```typescript
// GOOD: Agent owns single manager instance
class Agent {
  private sandboxManager: SandboxManager;

  async initialize() {
    this.sandboxManager = await SandboxManager.connectOrCreate({
      sandboxId: await this.loadCachedSandboxId(),
      kv: this.kv
    });
  }

  async shutdown() {
    await this.saveSandboxId(this.sandboxManager.getSandboxId());
    await this.sandboxManager.dispose();
  }
}
```

## Lifecycle Best Practices

1. **Initialize Once**: Create `SandboxManager` during Agent initialization
2. **Inject Everywhere**: Pass the manager instance to all tools
3. **Cache Sandbox ID**: Save `getSandboxId()` for next session to enable reconnection
4. **Dispose Properly**: Call `dispose()` when Agent is done
5. **Let Auto-KeepAlive Work**: Don't manually call `keepAlive()` unless you have a specific reason

## Testing

```typescript
import { SandboxManager } from '@agent-stack/sandbox/adapter/nodejs';

describe('MyAgent', () => {
  let sandbox: SandboxManager;

  beforeEach(async () => {
    // Use Node.js adapter for fast local tests
    sandbox = await SandboxManager.connectOrCreate('test-project', {
      workspacePath: '/tmp/test-workspace'
    });
  });

  afterEach(async () => {
    await sandbox.dispose();
  });

  it('should execute code', async () => {
    const result = await sandbox.bash.$`echo "test"`;
    expect(result.stdout.trim()).toBe('test');
  });
});
```

## Migration Guide

If you're using the old `get()` or `create()` methods:

```typescript
// Old way (still works but not recommended)
const manager = await SandboxManager.get({ kv, sandboxId });
const manager2 = await SandboxManager.create({ kv });

// New way (clearer semantics)
const manager = await SandboxManager.connectOrCreate({ kv, sandboxId });
const manager2 = await SandboxManager.forceCreate({ kv });
```

## See Also

- [E2B Documentation](https://e2b.dev/docs)
- [Agent Stack Documentation](../../README.md)
- [Type Definitions](./src/types/)
