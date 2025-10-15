/* agent-frontmatter:start
AGENT: Node.js sandbox bash adapter
PURPOSE: Execute shell commands and grep operations within the local Node.js sandbox runtime
USAGE: Instantiate with a working directory to run commands aligned with shared sandbox types
EXPORTS: Bash
FEATURES:
  - Streams stdout/stderr through typed callbacks
  - Returns normalized ShellCommandResult envelopes
  - Provides filesystem-based grep fallbacks
SEARCHABLE: nodejs sandbox bash, command runner, grep implementation, shell adapter
agent-frontmatter:end */

import * as fs from "node:fs/promises";
import path from "node:path";
import { type Options as ExecaOptions, execaCommand } from "execa";
import fg from "fast-glob";

import type {
  BashAPI,
  GrepFileResult,
  GrepLineMatch,
  GrepResult,
  ShellCommandOptions,
  ShellCommandPromise,
  ShellCommandResult,
} from "../../types/bash";

const toText = (chunk: unknown): string => {
  if (typeof chunk === "string") return chunk;
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk).toString("utf8");
  }
  if (chunk === null || chunk === undefined) return "";
  return String(chunk);
};

/**
 * Node.js implementation of BashAPI
 * Provides bash-like command operations using execa for better process management
 */
export class Bash implements BashAPI {
  private workingDirectory: string;

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
  }

  /**
   * Execute shell commands using template literal syntax
   */
  $(strings: TemplateStringsArray, ...values: unknown[]): ShellCommandPromise;
  $(
    options: ShellCommandOptions,
  ): (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => ShellCommandPromise;
  $(
    stringsOrOptions: TemplateStringsArray | ShellCommandOptions,
    ...values: unknown[]
  ):
    | ShellCommandPromise
    | ((
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => ShellCommandPromise) {
    const execute = (
      strings: TemplateStringsArray,
      vals: unknown[],
      providedOptions: ShellCommandOptions = {},
    ): ShellCommandPromise => {
      const command = this.buildCommand(strings, vals);
      return this.run(command, providedOptions);
    };

    if (!Array.isArray(stringsOrOptions)) {
      const options = { ...(stringsOrOptions as ShellCommandOptions) };
      return (strings: TemplateStringsArray, ...vals: unknown[]) =>
        execute(strings, vals, options);
    }

    return execute(stringsOrOptions as TemplateStringsArray, values);
  }

  private async run(
    command: string,
    options: ShellCommandOptions = {},
  ): Promise<ShellCommandResult> {
    const start = Date.now();

    const execaOptions: ExecaOptions = {
      cwd: options.cwd ?? this.workingDirectory,
      env: { ...process.env, ...(options.env ?? {}) },
      timeout: options.timeout,
      shell: true,
      windowsHide: true,
      reject: false,
      ...(options.background ? { detached: true, cleanup: false } : {}),
    };

    const child = execaCommand(command, execaOptions);
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    if (options.background && typeof child.unref === "function") {
      child.unref();
    }

    let requestTimeout: NodeJS.Timeout | null = null;
    let abortReason: string | undefined;
    if (typeof options.requestTimeoutMs === "number") {
      abortReason = `Command timed out after ${options.requestTimeoutMs}ms`;
      requestTimeout = setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGTERM");
        }
      }, options.requestTimeoutMs);
      requestTimeout.unref?.();
    }

    const handleStdout = (chunk: unknown): void => {
      const text = toText(chunk);
      if (text) {
        stdoutChunks.push(text);
      }
      if (options.onStdout) {
        Promise.resolve(options.onStdout(text)).catch((error) => {
          console.warn(
            `onStdout handler failed for command '${command}':`,
            error,
          );
        });
      }
    };

    const handleStderr = (chunk: unknown): void => {
      const text = toText(chunk);
      if (text) {
        stderrChunks.push(text);
      }
      if (options.onStderr) {
        Promise.resolve(options.onStderr(text)).catch((error) => {
          console.warn(
            `onStderr handler failed for command '${command}':`,
            error,
          );
        });
      }
    };

    child.stdout?.on("data", handleStdout);
    child.stderr?.on("data", handleStderr);

    try {
      const result = await child;
      const stdout = stdoutChunks.join("") || toText(result.stdout);
      const stderr = stderrChunks.join("") || toText(result.stderr);
      const exitCode =
        typeof result.exitCode === "number" ? result.exitCode : 0;

      return {
        exitCode,
        stdout,
        stderr,
        error: exitCode === 0 ? undefined : stderr || result.shortMessage,
        command,
        duration: Date.now() - start,
      };
    } catch (error) {
      const err = error as {
        exitCode?: number;
        stdout?: unknown;
        stderr?: unknown;
        shortMessage?: string;
        message?: string;
      };

      const stdout = stdoutChunks.join("") || toText(err.stdout);
      const stderr = stderrChunks.join("") || toText(err.stderr);
      const message =
        abortReason || err.shortMessage || err.message || String(error);

      return {
        exitCode: typeof err.exitCode === "number" ? err.exitCode : 1,
        stdout,
        stderr: stderr || message,
        error: message,
        command,
        duration: Date.now() - start,
      };
    } finally {
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }
    }
  }

  private buildCommand(
    strings: TemplateStringsArray,
    values: unknown[],
  ): string {
    return strings.reduce(
      (command, segment, index) =>
        command +
        segment +
        (index < values.length ? String(values[index]) : ""),
      "",
    );
  }

  /**
   * Search file contents based on pattern
   */
  async grep(
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
  ): Promise<GrepResult> {
    const startTime = Date.now();
    const searchPath = options?.path
      ? path.join(this.workingDirectory, options.path)
      : this.workingDirectory;
    const recursive = options?.recursive !== false;

    // Build glob patterns for file inclusion
    const includes = Array.isArray(options?.include)
      ? options.include
      : options?.include
        ? [options.include]
        : recursive
          ? ["**/*"]
          : ["*"];
    const excludes = Array.isArray(options?.exclude)
      ? options.exclude
      : options?.exclude
        ? [options.exclude]
        : [];

    // Get files to search
    const files: string[] = [];
    for (const includePattern of includes) {
      const pattern = recursive
        ? includePattern
        : includePattern.replace(/\*\*/g, "*");
      const matches = await fg(pattern, {
        cwd: searchPath,
        ignore: excludes,
        onlyFiles: true,
        absolute: false,
        deep: recursive ? undefined : 1,
      });
      files.push(...matches);
    }

    // Create regex pattern
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patternSource = options?.wholeWord
      ? `\\b${escapedPattern}\\b`
      : escapedPattern;
    const highlightFlags = options?.ignoreCase ? "gi" : "g";

    // Search files
    const fileResults: GrepFileResult[] = [];
    let totalMatches = 0;
    let collectedLines = 0;
    const maxResults = options?.maxResults ?? Infinity;

    for (const file of files) {
      if (collectedLines >= maxResults) break;

      const filePath = path.join(searchPath, file);

      try {
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split(/\r?\n/);
        const matches: GrepLineMatch[] = [];

        for (let i = 0; i < lines.length; i++) {
          if (collectedLines >= maxResults) break;

          const line = lines[i];
          if (!line) continue;

          const lineRegex = new RegExp(patternSource, highlightFlags);
          const lineMatches = Array.from(line.matchAll(lineRegex));
          if (!lineMatches.length) continue;

          matches.push({
            line,
            lineNumber: options?.showLineNumbers ? i + 1 : undefined,
            highlights: lineMatches.map((match) => ({
              start: match.index ?? 0,
              end: (match.index ?? 0) + match[0].length,
            })),
          });

          totalMatches += lineMatches.length;
          collectedLines += 1;

          if (options?.showFilesOnly) {
            break;
          }
        }

        if (matches.length > 0) {
          const stat = await fs.stat(filePath).catch(() => null);
          fileResults.push({
            filename: file,
            modifiedTime: stat?.mtime.getTime(),
            matches: options?.showFilesOnly ? undefined : matches,
            matchCount: matches.length,
          });
        }
      } catch {
        // Ignore unreadable files
      }
    }

    if (options?.sortByTime) {
      fileResults.sort((a, b) => (b.modifiedTime || 0) - (a.modifiedTime || 0));
    }

    return {
      files: fileResults,
      duration: Date.now() - startTime,
      totalFiles: fileResults.length,
      totalMatches,
    };
  }
}
