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

import fs from "node:fs/promises";
import path from "node:path";
import type {
  BashAPI,
  GrepFileResult,
  GrepLineMatch,
  GrepResult,
  ShellCommandOptions,
  ShellCommandPromise,
  ShellCommandResult,
} from "@agentstart/types";
import { type Options as ExecaOptions, execa } from "execa";
import glob from "fast-glob";
import { chunkToString, interpolateTemplate } from "../../utils/text";

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
      const command = interpolateTemplate(strings, vals);
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
      windowsHide: true,
      reject: false,
      ...(options.background ? { detached: true, cleanup: false } : {}),
    };

    const shellExecutable =
      process.platform === "win32"
        ? (process.env.ComSpec ?? "cmd.exe")
        : (process.env.SHELL ?? "/bin/bash");
    const shellArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", command]
        : ["-lc", command];

    const child = execa(shellExecutable, shellArgs, {
      ...execaOptions,
      shell: false,
      stripFinalNewline: false,
      windowsVerbatimArguments: process.platform === "win32",
    });

    if (options.background) child.unref?.();

    let abortReason: string | undefined;
    const requestTimeout = options.requestTimeoutMs
      ? setTimeout(() => {
          abortReason = `Command timed out after ${options.requestTimeoutMs}ms`;
          if (!child.killed) child.kill("SIGTERM");
        }, options.requestTimeoutMs)
      : null;
    requestTimeout?.unref?.();

    const createStreamHandler =
      (callback?: (text: string) => void | Promise<void>) =>
      (chunk: unknown): void => {
        if (!callback) return;
        const text = chunkToString(chunk);
        if (text) {
          Promise.resolve(callback(text)).catch((error) => {
            console.warn(
              `Stream handler failed for command '${command}':`,
              error,
            );
          });
        }
      };

    child.stdout?.on("data", createStreamHandler(options.onStdout));
    child.stderr?.on("data", createStreamHandler(options.onStderr));

    const buildResult = (
      stdout: string,
      stderr: string,
      exitCode: number,
      errorMessage?: string,
    ): ShellCommandResult => ({
      exitCode,
      stdout,
      stderr,
      error: errorMessage || (exitCode === 0 ? undefined : stderr),
      command,
      duration: Date.now() - start,
    });

    try {
      const result = await child;

      // Check if the command was killed due to timeout
      if (result.timedOut || result.isTerminated || result.isCanceled) {
        const timeoutError = new Error(
          abortReason ||
            `Command timed out after ${options.timeout || options.requestTimeoutMs} milliseconds: ${command}`,
        );
        (timeoutError as { timedOut?: boolean }).timedOut = true;
        throw timeoutError;
      }

      // Also check if exitCode indicates failure and we had set abortReason
      if (abortReason && result.exitCode !== 0) {
        const timeoutError = new Error(abortReason);
        (timeoutError as { timedOut?: boolean }).timedOut = true;
        throw timeoutError;
      }

      return buildResult(
        chunkToString(result.stdout),
        chunkToString(result.stderr),
        result.exitCode ?? 0,
        result.exitCode === 0 ? undefined : result.shortMessage,
      );
    } catch (error) {
      const err = error as {
        exitCode?: number;
        stdout?: unknown;
        stderr?: unknown;
        shortMessage?: string;
        message?: string;
        isTerminated?: boolean;
        isCanceled?: boolean;
        timedOut?: boolean;
      };

      // If this is a timeout/termination error, re-throw it
      if (err.timedOut || err.isTerminated || err.isCanceled || abortReason) {
        throw new Error(
          abortReason ||
            `Command timed out after ${options.timeout || options.requestTimeoutMs} milliseconds: ${command}`,
        );
      }

      return buildResult(
        chunkToString(err.stdout),
        chunkToString(err.stderr),
        err.exitCode ?? 1,
        err.shortMessage || err.message || String(error),
      );
    } finally {
      if (requestTimeout) clearTimeout(requestTimeout);
    }
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
      ? path.isAbsolute(options.path)
        ? options.path
        : path.join(this.workingDirectory, options.path)
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
      const matches = await glob(pattern, {
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
