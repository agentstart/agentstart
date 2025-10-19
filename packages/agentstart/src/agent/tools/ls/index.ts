import { formatDate, formatSize } from "@agentstart/utils";
import { tool } from "ai";
import path from "pathe";
import type { BaseContext } from "@/agent/context";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import { getRichError } from "@/agent/tools/get-rich-error";
import description from "./description";

// Default ignore patterns for common build/cache directories
export const DEFAULT_IGNORE_PATTERNS = [
  "node_modules/",
  "__pycache__/",
  ".git/",
  "dist/",
  "build/",
  "target/",
  "vendor/",
  "bin/",
  "obj/",
  ".idea/",
  ".vscode/",
  ".zig-cache/",
  "zig-out",
  ".coverage",
  "coverage/",
  "tmp/",
  "temp/",
  ".cache/",
  "cache/",
  "logs/",
  ".venv/",
  "venv/",
  "env/",
];

// Constants
const RESULT_LIMIT = 100; // Maximum number of results to return

export const ls = tool({
  description,
  inputSchema: toolInputSchema.shape.ls,
  outputSchema: toolOutputSchema.shape.ls,
  async *execute(
    { path: targetPath, ignore },
    { experimental_context: context },
  ) {
    const { sandbox } = context as BaseContext;

    // Use current directory if no path specified
    const resolvedPath = targetPath || "/";

    yield {
      status: "pending" as const,
      prompt: `Listing directory: ${resolvedPath}`,
    } satisfies AgentStartToolOutput["ls"];

    try {
      // Check if the path exists and is a directory
      const stats = await sandbox.fs.stat(resolvedPath);

      if (!stats.isDirectory()) {
        const richError = getRichError({
          action: "list directory",
          args: { path: resolvedPath, ignore },
          error: `Path "${resolvedPath}" is not a directory`,
        });

        yield {
          status: "error" as const,
          prompt: richError.message,
          error: richError.error,
        } satisfies AgentStartToolOutput["ls"];
        return;
      }
      // Combine default and user-provided ignore patterns
      const allIgnorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...(ignore || [])];

      // List all files and directories with ignore patterns
      const entries = await sandbox.fs.readdir(resolvedPath, {
        ignores: allIgnorePatterns,
      });

      // Prepare file information
      const fileInfos = [];
      let truncated = false;

      for (const entry of entries) {
        // Check result limit
        if (fileInfos.length >= RESULT_LIMIT) {
          truncated = true;
          break;
        }

        const fullPath = path.join(resolvedPath, entry.name);

        try {
          const stat = await sandbox.fs.stat(fullPath);

          fileInfos.push({
            name: entry.name,
            type: stat.isDirectory()
              ? ("directory" as const)
              : stat.isSymbolicLink()
                ? ("symlink" as const)
                : ("file" as const),
            size: stat.size,
            modifiedTime: stat.mtime.getTime(),
            permissions: 0, // Permissions not easily available
          });
        } catch {}
      }

      // Sort: directories first, then alphabetically
      fileInfos.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });

      // Format output
      let prompt: string;
      if (fileInfos.length === 0) {
        prompt = "No files found";
      } else {
        // Format output similar to ls command
        const lines = fileInfos.map((info) => {
          const typeIndicator =
            info.type === "directory"
              ? "/"
              : info.type === "symlink"
                ? "@"
                : "";
          const size = info.type === "directory" ? "-" : formatSize(info.size);
          const date = formatDate(info.modifiedTime);

          return `${info.type[0]}  ${size.padStart(6)}  ${date}  ${
            info.name
          }${typeIndicator}`;
        });

        const outputLines = [`Total ${fileInfos.length} items`, ...lines];

        if (truncated) {
          outputLines.push("");
          outputLines.push(
            "(Results are truncated. Consider using more specific ignore patterns.)",
          );
        }

        prompt = outputLines.join("\n");
      }

      yield {
        status: "done" as const,
        metadata: {
          entries: fileInfos,
          count: fileInfos.length,
          truncated,
          path: resolvedPath,
        },
        prompt,
      } satisfies AgentStartToolOutput["ls"];
    } catch (error) {
      const richError = getRichError({
        action: "list directory",
        args: { path: resolvedPath, ignore },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStartToolOutput["ls"];
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
