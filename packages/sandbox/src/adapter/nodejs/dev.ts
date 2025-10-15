/* agent-frontmatter:start
AGENT: Node.js sandbox dev adapter
PURPOSE: Manage long-lived development commands within the Node.js sandbox runtime
USAGE: Start or stop dev processes with optional streaming output support
EXPORTS: Dev
FEATURES:
  - Spawns shell commands with streaming stdout/stderr handling
  - Collects aggregated output for stop requests
  - Tracks process lifecycle in memory for reuse
SEARCHABLE: nodejs sandbox dev adapter, development command runner, streaming subprocess
agent-frontmatter:end */

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";

import type {
  DevAPI,
  DevServerResult,
  DevStreamOutput,
  StartDevOptions,
  StopDevOptions,
} from "../../types/dev";

interface ManagedCommand {
  id: string;
  command: string;
  startedAt: Date;
  child: ChildProcessWithoutNullStreams;
  completion: Promise<DevServerResult>;
  status: "running" | "stopping" | "stopped";
  stdoutBuffer: string;
  stderrBuffer: string;
}

const DEFAULT_SIGNAL: NodeJS.Signals = "SIGTERM";

const toText = (chunk: unknown): string => {
  if (typeof chunk === "string") return chunk;
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk).toString("utf8");
  }
  if (chunk === null || chunk === undefined) return "";
  return String(chunk);
};

const appendChunk = (buffer: string, value: string): string =>
  value ? buffer + value : buffer;

const appendLine = (buffer: string, value: string): string =>
  value ? (buffer ? `${buffer}\n${value}` : value) : buffer;

export class Dev implements DevAPI {
  private readonly workingDirectory: string;
  private readonly commands = new Map<string, ManagedCommand>();
  private nextId = 1;

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
  }

  startDev(
    options: StartDevOptions & { stream: true },
  ): AsyncGenerator<DevStreamOutput>;
  startDev(
    options: StartDevOptions & { stream?: false },
  ): Promise<DevStreamOutput>;
  startDev(
    options: StartDevOptions,
  ): Promise<DevStreamOutput> | AsyncGenerator<DevStreamOutput> {
    const stream = options.stream ?? false;
    if (stream) {
      return this.startDevStreaming(options);
    }
    return this.startDevNormal(options);
  }

  private async startDevNormal(
    options: StartDevOptions,
  ): Promise<DevStreamOutput> {
    const managed = this.launchCommand(options);

    const stdoutListener = (chunk: unknown): void => {
      const text = toText(chunk);
      if (text) process.stdout.write(text);
    };
    const stderrListener = (chunk: unknown): void => {
      const text = toText(chunk);
      if (text) process.stderr.write(text);
    };

    managed.child.stdout.on("data", stdoutListener);
    managed.child.stderr.on("data", stderrListener);

    const cleanup = (): void => {
      managed.child.stdout.off("data", stdoutListener);
      managed.child.stderr.off("data", stderrListener);
    };

    managed.child.once("close", cleanup);
    managed.child.once("error", cleanup);

    return {
      id: managed.id,
      command: managed.command,
      pid: managed.child.pid ?? undefined,
      startedAt: managed.startedAt,
    };
  }

  private async *startDevStreaming(
    options: StartDevOptions,
  ): AsyncGenerator<DevStreamOutput> {
    const managed = this.launchCommand(options);
    const pid = managed.child.pid ?? undefined;

    const baseEvent = {
      id: managed.id,
      command: managed.command,
      pid,
      startedAt: managed.startedAt,
    } as const;

    const queue: DevStreamOutput[] = [{ ...baseEvent }];
    let resolveNext: (() => void) | null = null;
    let finished = false;

    const notify = (): void => {
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    };

    const enqueue = (event: DevStreamOutput): void => {
      queue.push(event);
      notify();
    };

    const finish = (): void => {
      if (!finished) {
        finished = true;
        notify();
      }
    };

    const stdoutListener = (chunk: unknown): void => {
      const text = toText(chunk);
      if (!text) return;
      process.stdout.write(text);
      enqueue({
        ...baseEvent,
        type: "stdout",
        text,
      });
    };

    const stderrListener = (chunk: unknown): void => {
      const text = toText(chunk);
      if (!text) return;
      process.stderr.write(text);
      enqueue({
        ...baseEvent,
        type: "stderr",
        text,
      });
    };

    const errorListener = (error: Error): void => {
      const message = error instanceof Error ? error.message : String(error);
      if (message) {
        enqueue({
          ...baseEvent,
          type: "stderr",
          text: message,
        });
      }
      finish();
    };

    managed.child.stdout.on("data", stdoutListener);
    managed.child.stderr.on("data", stderrListener);
    managed.child.once("error", errorListener);
    managed.child.once("close", finish);

    try {
      while (!finished || queue.length > 0) {
        if (!queue.length) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
          continue;
        }

        const next = queue.shift();
        if (!next) {
          continue;
        }
        yield next;
      }
    } finally {
      managed.child.stdout.off("data", stdoutListener);
      managed.child.stderr.off("data", stderrListener);
      managed.child.off("error", errorListener);
      managed.child.off("close", finish);
    }
  }

  private launchCommand(options: StartDevOptions): ManagedCommand {
    const id = options.id ?? `command-${this.nextId++}`;
    if (this.commands.has(id)) {
      throw new Error(`Command '${id}' is already running`);
    }

    const child = spawn(options.command, {
      shell: true,
      cwd: options.cwd ?? this.workingDirectory,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: "pipe",
    }) as ChildProcessWithoutNullStreams;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    const startedAt = new Date();
    const managed: ManagedCommand = {
      id,
      command: options.command,
      startedAt,
      child,
      status: "running",
      stdoutBuffer: "",
      stderrBuffer: "",
      completion: Promise.resolve({
        id,
        command: options.command,
        exitCode: null,
        stdout: "",
        stderr: "",
      }),
    };

    child.stdout.on("data", (chunk) => {
      const text = toText(chunk);
      if (!text) return;
      managed.stdoutBuffer = appendChunk(managed.stdoutBuffer, text);
    });

    child.stderr.on("data", (chunk) => {
      const text = toText(chunk);
      if (!text) return;
      managed.stderrBuffer = appendChunk(managed.stderrBuffer, text);
    });

    managed.completion = new Promise<DevServerResult>((resolve) => {
      let resolved = false;

      const finalize = (
        exitCode: number | null,
        errorMessage?: string,
      ): void => {
        if (resolved) return;
        resolved = true;

        if (errorMessage) {
          managed.stderrBuffer = appendLine(managed.stderrBuffer, errorMessage);
        }

        managed.status = "stopped";
        this.commands.delete(id);

        resolve({
          id,
          command: options.command,
          exitCode,
          stdout: managed.stdoutBuffer,
          stderr: managed.stderrBuffer,
        });
      };

      child.once("close", (code) => {
        finalize(typeof code === "number" ? code : null);
      });

      child.once("error", (error) => {
        const message = error instanceof Error ? error.message : String(error);
        finalize(1, message);
      });
    });

    this.commands.set(id, managed);
    return managed;
  }

  async stopDev(options: StopDevOptions): Promise<DevServerResult> {
    const managed = this.commands.get(options.id);
    if (!managed) {
      throw new Error(`Command '${options.id}' is not running`);
    }

    if (managed.status === "running") {
      managed.status = "stopping";
      managed.child.kill(options.signal ?? DEFAULT_SIGNAL);
    }

    return managed.completion;
  }

  getHost(port: number): string | null {
    return `http://localhost:${port}`;
  }
}
