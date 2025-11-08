/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Ls tool execution within the AgentStart runtime.
USAGE: Register the "ls" tool when composing the agent configuration to expose this capability.
EXPORTS: DEFAULT_IGNORE_PATTERNS, ls
FEATURES:
  - Bridges sandbox APIs into the Ls workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, agent, tools, ls, index, tool, runtime
agent-frontmatter:end */

import type { RuntimeContext } from "@agentstart/types";
import { formatDate, formatSize } from "@agentstart/utils";
import { tool } from "ai";
import path from "pathe";
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
    { path: targetPath, ignore, recursive = false },
    { experimental_context: context },
  ) {
    const { sandbox } = context as RuntimeContext;

    // Use current directory if no path specified
    const resolvedPath = targetPath || "/";

    yield {
      status: "pending" as const,
      prompt: `Listing directory: ${resolvedPath}${recursive ? " (recursive)" : ""}`,
    } satisfies AgentStartToolOutput["ls"];

    try {
      // Check if the path exists and is a directory
      const stats = await sandbox.fs.stat(resolvedPath);

      if (!stats.isDirectory()) {
        const richError = getRichError({
          action: "list directory",
          args: { path: resolvedPath, ignore, recursive },
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
        recursive,
        ignores: allIgnorePatterns,
      });

      // Prepare file information
      const fileInfos = [];
      let truncated = false;

      for (const entry of entries) {
        // Check result limit (only apply in non-recursive mode or first 500 items in recursive)
        const limit = recursive ? 500 : RESULT_LIMIT;
        if (fileInfos.length >= limit) {
          truncated = true;
          break;
        }

        const fullPath = entry.path || path.join(resolvedPath, entry.name);

        try {
          const stat = await sandbox.fs.stat(fullPath);
          const isDir = entry.isDirectory();
          const isSym = stat.isSymbolicLink();

          fileInfos.push({
            name: entry.name,
            path: fullPath,
            parentPath: entry.parentPath || resolvedPath,
            type: isDir
              ? ("directory" as const)
              : isSym
                ? ("symlink" as const)
                : ("file" as const),
            size: stat.size,
            modifiedTime: stat.mtime.getTime(),
            permissions: 0, // Permissions not easily available
            isFile: entry.isFile(),
            isDirectory: isDir,
          });
        } catch {}
      }

      // Sort: directories first, then alphabetically by path
      fileInfos.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return recursive
          ? a.path.localeCompare(b.path)
          : a.name.localeCompare(b.name);
      });

      // Format output
      let prompt: string;
      if (fileInfos.length === 0) {
        prompt = "No files found";
      } else {
        if (recursive) {
          // For recursive mode, show tree-like structure summary
          const fileCount = fileInfos.filter((e) => e.isFile).length;
          const dirCount = fileInfos.filter((e) => e.isDirectory).length;

          const lines = [
            `Total ${fileInfos.length} items (${fileCount} files, ${dirCount} directories)`,
          ];

          // Show top-level items
          const topLevel = fileInfos
            .filter((entry) => entry.parentPath === resolvedPath)
            .slice(0, 20);

          if (topLevel.length > 0) {
            lines.push("\nTop-level items:");
            for (const entry of topLevel) {
              const icon = entry.isDirectory ? "📁" : "📄";
              lines.push(`  ${icon} ${entry.name}`);
            }
          }

          if (truncated) {
            lines.push("");
            lines.push("(Results are truncated to 500 items)");
          }

          prompt = lines.join("\n");
        } else {
          // Format output similar to ls command for non-recursive
          const lines = fileInfos.map((info) => {
            const typeIndicator =
              info.type === "directory"
                ? "/"
                : info.type === "symlink"
                  ? "@"
                  : "";
            const size =
              info.type === "directory" ? "-" : formatSize(info.size);
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
      }

      yield {
        status: "done" as const,
        metadata: {
          entries: fileInfos,
          count: fileInfos.length,
          truncated,
          rootPath: resolvedPath,
        },
        prompt,
      } satisfies AgentStartToolOutput["ls"];
    } catch (error) {
      const richError = getRichError({
        action: "list directory",
        args: { path: resolvedPath, ignore, recursive },
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
