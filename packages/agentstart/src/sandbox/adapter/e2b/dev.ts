import type Sandbox from "@e2b/code-interpreter";

import type { ShellCommandResult } from "@/sandbox/types/bash";
import type {
  DevAPI,
  DevServerResult,
  DevStreamOutput,
  StartDevOptions,
  StopDevOptions,
} from "@/sandbox/types/dev";

import { Bash } from "./bash";
import { DEFAULT_WORKING_DIRECTORY } from "./constants";

/**
 * Minimal Dev server manager for E2B
 * Automatically refreshes sandbox heartbeat through Bash operations
 */
export class Dev implements DevAPI {
  private readonly bash: Bash;
  private readonly commands = new Map<string, Promise<ShellCommandResult>>();
  private nextId = 1;

  constructor(
    private readonly sandbox: Sandbox,
    manager?: { keepAlive: () => Promise<void> | void },
  ) {
    this.bash = new Bash(sandbox, manager);
  }

  /**
   * Start dev server
   */
  startDev(
    options: StartDevOptions & { stream: true },
  ): AsyncGenerator<DevStreamOutput>;
  startDev(
    options: StartDevOptions & { stream?: false },
  ): Promise<DevStreamOutput>;
  startDev(
    options: StartDevOptions,
  ): Promise<DevStreamOutput> | AsyncGenerator<DevStreamOutput> {
    return options.stream
      ? this.startStreaming(options)
      : this.startNormal(options);
  }

  /**
   * Start without streaming
   */
  private async startNormal(
    options: StartDevOptions,
  ): Promise<DevStreamOutput> {
    const id = options.id ?? `command-${this.nextId++}`;

    if (this.commands.has(id)) {
      throw new Error(`Command '${id}' is already running`);
    }

    const promise = this.bash.$({
      cwd: options.cwd ?? DEFAULT_WORKING_DIRECTORY,
      env: options.env,
    })`${options.command}`;

    this.commands.set(id, promise);
    promise.finally(() => this.commands.delete(id));

    return {
      id,
      command: options.command,
      pid: undefined,
      startedAt: new Date(),
    };
  }

  /**
   * Start with streaming
   */
  private async *startStreaming(
    options: StartDevOptions,
  ): AsyncGenerator<DevStreamOutput> {
    const id = options.id ?? `command-${this.nextId++}`;

    if (this.commands.has(id)) {
      throw new Error(`Command '${id}' is already running`);
    }

    const startedAt = new Date();

    // Use a simple queue and promise pattern
    const queue: Array<
      { type: "data"; value: DevStreamOutput } | { type: "end" }
    > = [];
    let waiter: (() => void) | null = null;

    // Execute with streaming callbacks
    const promise = this.bash.$({
      cwd: options.cwd ?? DEFAULT_WORKING_DIRECTORY,
      env: options.env,
      onStdout: (text) => {
        queue.push({
          type: "data",
          value: {
            id,
            command: options.command,
            pid: undefined,
            startedAt,
            type: "stdout",
            text,
          },
        });
        waiter?.();
      },
      onStderr: (text) => {
        // Filter out messages starting with cross-env
        if (!text.startsWith("$ cross-env")) {
          queue.push({
            type: "data",
            value: {
              id,
              command: options.command,
              pid: undefined,
              startedAt,
              type: "stderr",
              text,
            },
          });
        }

        waiter?.();
      },
    })`${options.command}`;

    this.commands.set(id, promise);

    // Mark completion
    promise.finally(() => {
      this.commands.delete(id);
      queue.push({ type: "end" });
      waiter?.();
    });

    // Yield initial status
    yield {
      id,
      command: options.command,
      pid: undefined,
      startedAt,
    };

    // Stream events
    while (true) {
      // Wait for items if queue is empty
      while (queue.length === 0) {
        await new Promise<void>((resolve) => {
          waiter = resolve;
        });
      }

      const item = queue.shift()!;
      if (item.type === "end") {
        break;
      }
      yield item.value;
    }
  }

  /**
   * Stop dev server
   */
  async stopDev(options: StopDevOptions): Promise<DevServerResult> {
    const promise = this.commands.get(options.id);

    if (!promise) {
      throw new Error(`Command '${options.id}' is not running`);
    }

    // Note: E2B doesn't support killing processes, just wait for completion
    const result = await promise;

    return {
      id: options.id,
      command: result.command || "",
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  /**
   * Get host URL for port
   */
  getHost(port: number): string | null {
    try {
      return this.sandbox.getHost(port) ?? null;
    } catch {
      return null;
    }
  }
}
