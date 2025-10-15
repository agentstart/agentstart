/* agent-frontmatter:start
AGENT: Sandbox Bash command typing
PURPOSE: Define typed interfaces mirroring sandbox shell execution contracts
USAGE: Import for strongly typed bash interactions with the sandbox runtime
EXPORTS: ShellCommandOptions, ShellCommandResult, ShellCommandHandle, ShellCommandPromise, BashAPI, GrepResult, GrepFileResult, GrepLineMatch
FEATURES:
  - Aligns with E2B command schema
  - Supports streaming callbacks
  - Provides typed grep responses
SEARCHABLE: bash api, sandbox shell, command execution, grep typings
agent-frontmatter:end */

/**
 * Command execution options matching the E2B `CommandStartOpts` shape.
 */
export interface ShellCommandOptions {
  /**
   * If true, starts command in the background and returns immediately
   */
  background?: boolean;

  /**
   * Working directory for the command
   */
  cwd?: string;

  /**
   * Environment variables for the command
   */
  env?: Record<string, string>;

  /**
   * Callback for streaming stdout output
   */
  onStdout?: (data: string) => void | Promise<void>;

  /**
   * Callback for streaming stderr output
   */
  onStderr?: (data: string) => void | Promise<void>;

  /**
   * Timeout for the command in milliseconds
   * @default 60000 (60 seconds)
   */
  timeout?: number;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  requestTimeoutMs?: number;
}

/**
 * Command execution result aligned with the E2B `CommandResult` contract.
 */
export interface ShellCommandResult {
  /**
   * Command execution exit code
   * 0 if the command finished successfully
   */
  exitCode: number;

  /**
   * Standard output from the command
   */
  stdout: string;

  /**
   * Standard error from the command
   */
  stderr: string;

  /**
   * Error message if command execution failed
   */
  error?: string;

  /**
   * The command that was executed
   */
  command?: string;

  /**
   * Execution duration in milliseconds
   */
  duration?: number;
}

/**
 * Command handle for background bash processes.
 */
export interface ShellCommandHandle {
  /**
   * Process ID
   */
  pid?: number;

  /**
   * Wait for the command to finish and get its result
   */
  wait(): Promise<ShellCommandResult>;

  /**
   * Kill the running command
   */
  kill(signal?: NodeJS.Signals): boolean;
}

/**
 * Promise that resolves to a command result.
 */
export type ShellCommandPromise = Promise<ShellCommandResult>;

/**
 * High-level bash helpers exposed by the sandbox runtime.
 */
export interface BashAPI {
  /**
   * Execute a command and wait for it to complete
   */
  $(strings: TemplateStringsArray, ...values: unknown[]): ShellCommandPromise;
  /**
   * Execute a command with options
   */
  $(
    options: ShellCommandOptions,
  ): (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => ShellCommandPromise;

  /**
   * Search file contents using grep
   */
  grep(
    pattern: string,
    options?: {
      path?: string;
      include?: string | string[];
      exclude?: string | string[];
      ignoreCase?: boolean;
      showLineNumbers?: boolean;
      showFilesOnly?: boolean;
      maxResults?: number;
      sortByTime?: boolean;
      context?: number;
      wholeWord?: boolean;
      recursive?: boolean;
    },
  ): Promise<GrepResult>;
}

/**
 * Grep search aggregate result.
 */
export interface GrepResult {
  files: GrepFileResult[];
  duration: number;
  totalFiles: number;
  totalMatches: number;
}

/**
 * Individual file result from grep.
 */
export interface GrepFileResult {
  filename: string;
  matches?: GrepLineMatch[];
  matchCount: number;
  modifiedTime?: number;
}

/**
 * Individual grep match with optional highlight ranges.
 */
export interface GrepLineMatch {
  line: string;
  lineNumber?: number;
  highlights?: Array<{
    start: number;
    end: number;
  }>;
}
