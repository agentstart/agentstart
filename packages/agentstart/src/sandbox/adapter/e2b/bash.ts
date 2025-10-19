import type { Sandbox } from "@e2b/code-interpreter";
import type {
  BashAPI,
  GrepFileResult,
  GrepLineMatch,
  GrepResult,
  ShellCommandOptions,
  ShellCommandPromise,
  ShellCommandResult,
} from "@/sandbox/types/bash";
import { interpolateTemplate } from "@/sandbox/utils/text";
import { DEFAULT_WORKING_DIRECTORY } from "./constants";

/**
 * Minimal E2B Bash adapter - directly wraps sandbox.commands.run
 * Automatically refreshes sandbox heartbeat on each operation
 */
export class Bash implements BashAPI {
  constructor(
    private readonly sandbox: Sandbox,
    private readonly manager?: { keepAlive: () => Promise<void> | void },
  ) {}

  /**
   * Execute command with template literals
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
    if (!Array.isArray(stringsOrOptions)) {
      // Curried form with options
      const options = stringsOrOptions as ShellCommandOptions;
      return (strings, ...vals) =>
        this.run(interpolateTemplate(strings, vals), options);
    }
    // Direct execution
    const strings = stringsOrOptions as TemplateStringsArray;
    return this.run(interpolateTemplate(strings, values));
  }

  /**
   * Execute command using E2B
   */
  private async run(
    command: string,
    options: ShellCommandOptions = {},
  ): Promise<ShellCommandResult> {
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    if (options.background) {
      throw new Error(
        "Background commands are not supported by the E2B Bash adapter",
      );
    }

    const start = Date.now();
    let stdout = "";
    let stderr = "";

    try {
      const runOptions: Record<string, unknown> = {
        cwd: options.cwd ?? DEFAULT_WORKING_DIRECTORY,
        envs: options.env,
      };

      if (typeof options.timeout === "number") {
        runOptions.timeoutMs = options.timeout;
      }

      if (typeof options.requestTimeoutMs === "number") {
        runOptions.requestTimeoutMs = options.requestTimeoutMs;
      }

      const result = await this.sandbox.commands.run(command, {
        ...runOptions,
        onStdout: (data) => {
          stdout += data;
          options.onStdout?.(data);
        },
        onStderr: (data) => {
          stderr += data;
          options.onStderr?.(data);
        },
      });

      return {
        exitCode: result.exitCode ?? 0,
        stdout,
        stderr,
        error: result.error,
        command,
        duration: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stdout,
        stderr: stderr || message,
        error: message,
        command,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Simple grep implementation
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const start = Date.now();

    // Build grep command
    const args = [];
    if (options?.ignoreCase) args.push("-i");
    if (options?.showLineNumbers) args.push("-n");
    if (options?.showFilesOnly) args.push("-l");
    if (options?.wholeWord) args.push("-w");
    if (options?.recursive !== false) args.push("-r");
    if (options?.context) args.push(`-C ${options.context}`);

    // Add include/exclude
    const addPatterns = (patterns: string | string[], flag: string) => {
      const list = Array.isArray(patterns) ? patterns : [patterns];
      for (const patternItem of list) {
        if (typeof patternItem === "string") {
          args.push(`${flag}="${patternItem}"`);
        }
      }
    };
    if (options?.include) addPatterns(options.include, "--include");
    if (options?.exclude) addPatterns(options.exclude, "--exclude");

    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const path = options?.path || DEFAULT_WORKING_DIRECTORY;
    const command = `grep ${args.join(" ")} "${escapedPattern}" "${path}"${
      options?.maxResults ? ` | head -n ${options.maxResults}` : ""
    }`;

    // Execute grep
    const result = await this.run(command);

    // Parse output
    const files: GrepFileResult[] = [];
    if (result.exitCode === 0 && result.stdout) {
      const matches = new Map<string, GrepLineMatch[]>();

      for (const rawLine of result.stdout.trim().split("\n")) {
        if (!rawLine) continue;

        if (options?.showFilesOnly) {
          matches.set(rawLine, []);
          continue;
        }

        const parts = rawLine.split(":");
        const filename = parts[0];
        if (!filename) continue;

        const hasLineNum =
          Boolean(options?.showLineNumbers) && parts.length >= 3;
        const lineNumber = hasLineNum
          ? parseInt(parts[1] ?? "", 10)
          : undefined;
        const content =
          parts.length > 1 ? parts.slice(hasLineNum ? 2 : 1).join(":") : "";

        const existingMatches = matches.get(filename) ?? [];
        existingMatches.push({ line: content, lineNumber });
        matches.set(filename, existingMatches);
      }

      for (const [filename, matchList] of matches) {
        files.push({
          filename,
          matches: matchList.length > 0 ? matchList : undefined,
          matchCount: matchList.length,
        });
      }
    }

    return {
      files,
      duration: Date.now() - start,
      totalFiles: files.length,
      totalMatches: files.reduce((sum, f) => sum + f.matchCount, 0),
    };
  }
}
