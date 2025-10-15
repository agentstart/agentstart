import { tool } from "ai";
import path from "path-browserify-esm";
import type { BaseContext } from "../../../context";
import {
  type AgentStackToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "../../messages";
import { getRichError } from "../get-rich-error";
import description from "./description.md";

// Constants
const RESULT_LIMIT = 100; // Maximum number of results to return

export const glob = tool({
  description,
  inputSchema: toolInputSchema.shape.glob,
  outputSchema: toolOutputSchema.shape.glob,
  async *execute(
    { pattern, path: searchPath },
    { experimental_context: context },
  ) {
    const { sandboxManager } = context as BaseContext;

    yield {
      status: "pending" as const,
      prompt: `Searching: ${pattern} in ${searchPath || "current directory"}`,
    } satisfies AgentStackToolOutput["glob"];

    try {
      // Determine search path (use root if not specified)
      const searchDir = searchPath ?? "/";

      // Verify the directory exists if path was provided
      if (searchPath) {
        try {
          const stats = await sandboxManager.fs.stat(searchDir);
          if (!stats.isDirectory()) {
            const richError = getRichError({
              action: "glob search",
              args: { pattern, path: searchPath },
              error: `Path "${searchPath}" is not a directory`,
            });

            yield {
              status: "error" as const,
              prompt: richError.message,
              error: richError.error,
            } satisfies AgentStackToolOutput["glob"];
            return;
          }
        } catch {
          const richError = getRichError({
            action: "glob search",
            args: { pattern, path: searchPath },
            error: `Path "${searchPath}" does not exist`,
          });

          yield {
            status: "error" as const,
            prompt: richError.message,
            error: richError.error,
          } satisfies AgentStackToolOutput["glob"];
          return;
        }
      }

      // Execute glob search using the FileSystem adapter
      const matches = await sandboxManager.fs.glob(pattern, {
        cwd: searchDir,
        withFileTypes: false,
      });

      // Collect files with stats
      const filesWithStats = [];
      let truncated = false;

      // Process matches and collect stats
      for (const match of matches as string[]) {
        // Check result limit
        if (filesWithStats.length >= RESULT_LIMIT) {
          truncated = true;
          break;
        }

        const fullPath = path.isAbsolute(match)
          ? match
          : path.join(searchDir, match);

        try {
          const stats = await sandboxManager.fs.stat(fullPath);
          filesWithStats.push({
            path: match,
            fullPath,
            modifiedTime: stats.mtime.getTime(),
            size: stats.size,
            isDirectory: stats.isDirectory(),
          });
        } catch {
          // If we can't stat the file, include it without stats
          filesWithStats.push({
            path: match,
            fullPath,
            modifiedTime: 0,
            size: 0,
            isDirectory: false,
          });
        }
      }

      // Sort by modification time (newest first)
      filesWithStats.sort((a, b) => b.modifiedTime - a.modifiedTime);

      // Build output
      let prompt: string;
      const outputLines = [];

      if (filesWithStats.length === 0) {
        outputLines.push("No files found");
        prompt = `No files found matching pattern: ${pattern}`;
      } else {
        // Format output with file paths
        const lines = filesWithStats.map((file) => {
          const typeIndicator = file.isDirectory ? "/" : "";
          // Use full path in output for clarity
          return `${file.fullPath}${typeIndicator}`;
        });

        outputLines.push(...lines);

        if (truncated) {
          outputLines.push("");
          outputLines.push(
            "(Results are truncated. Consider using a more specific path or pattern.)",
          );
        }

        prompt = outputLines.join("\n");
      }

      yield {
        status: "done" as const,
        metadata: {
          matches: filesWithStats.map((f) => f.fullPath),
          count: filesWithStats.length,
          truncated,
          searchPath: searchDir,
        },
        prompt,
      } satisfies AgentStackToolOutput["glob"];
    } catch (error) {
      const richError = getRichError({
        action: "glob search",
        args: { pattern, path: searchPath },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStackToolOutput["glob"];
    }
  },
  toModelOutput: (output) => {
    if (output.error) {
      return {
        type: "error-text" as const,
        value: output.prompt,
      };
    }

    return {
      type: "text" as const,
      value: output.prompt,
    };
  },
});
