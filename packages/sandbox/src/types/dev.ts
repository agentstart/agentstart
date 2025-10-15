/* agent-frontmatter:start
AGENT: Sandbox development command typing
PURPOSE: Define types for running and controlling long-lived development commands in the sandbox
USAGE: Import to type sandbox development server helpers and lifecycle controls
EXPORTS: StartDevOptions, DevStreamOutput, StopDevOptions, DevServerResult, DevAPI
FEATURES:
  - Supports streaming and promise-based command execution
  - Encodes minimal surface area for sandbox dev lifecycle
SEARCHABLE: sandbox dev api, command runner typings, background process control
agent-frontmatter:end */

export interface StartDevOptions {
  /** Optional identifier so callers can manage multiple commands. */
  id?: string;
  /** Shell command to execute. */
  command: string;
  /** Working directory (defaults to the sandbox workspace). */
  cwd?: string;
  /** Environment variables to pass to the command. */
  env?: Record<string, string>;
  /**
   * Placeholder flag to keep forward compatibility with callers.
   * The simplified implementation ignores it, but we accept it to avoid
   * unnecessary refactors across the codebase.
   */
  stream?: boolean;
}

export interface DevStreamOutput {
  /** Identifier that can be used to stop the command later. */
  id: string;
  /** Command string that was executed. */
  command: string;
  /** Process identifier if available. */
  pid?: number;
  /** Start timestamp. */
  startedAt: Date;
  /** Stream output type (only present in output messages). */
  type?: "stdout" | "stderr";
  /** Stream output text (only present in output messages). */
  text?: string;
}

export interface StopDevOptions {
  /** Identifier of the command to stop. */
  id: string;
  /** Optional signal (defaults to SIGTERM). */
  signal?: NodeJS.Signals;
}

export interface DevServerResult {
  /** Identifier of the command that finished. */
  id: string;
  /** Exit code if the process reached one, otherwise null. */
  exitCode: number | null;
  /** Captured stdout from the command. */
  stdout: string;
  /** Captured stderr from the command. */
  stderr: string;
  /** Original command string. */
  command: string;
}

export interface DevAPI {
  /** Start a command and keep it running in the background. */
  startDev(
    options: StartDevOptions & { stream: true },
  ): AsyncGenerator<DevStreamOutput>;
  startDev(
    options: StartDevOptions & { stream?: false },
  ): Promise<DevStreamOutput>;
  startDev(
    options: StartDevOptions,
  ): Promise<DevStreamOutput> | AsyncGenerator<DevStreamOutput>;
  /** Stop a running command and return its collected output. */
  stopDev(options: StopDevOptions): Promise<DevServerResult>;
  /** Resolve the host address for a forwarded port (if applicable). */
  getHost(port: number): string | null;
}
