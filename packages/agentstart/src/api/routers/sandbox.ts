/* agent-frontmatter:start
AGENT: Sandbox router using oRPC
PURPOSE: Provide sandbox file system operations API for file tree components
USAGE: const sandboxRouter = createSandboxRouter(customProcedure)
EXPORTS: createSandboxRouter
FEATURES:
  - Lists files and directories using the sandbox fs API
  - Returns flat file tree structure with parent-child relationships
  - Supports recursive directory scanning
  - Type-safe file node schema
SEARCHABLE: sandbox router, file tree, filesystem api, orpc router
agent-frontmatter:end */

import z from "zod";
import { type AgentStartUIMessage, loadThread } from "@/agent";
import { publicProcedure } from "@/api/procedures";
import { handleRouterError } from "@/api/utils/error-handler";
import { getAdapter } from "@/memory";
import { getSandbox } from "@/sandbox";

/**
 * Schema for file node returned by sandbox API
 */
export const fileNodeSchema = z.object({
  name: z.string(),
  path: z.string(),
  parentPath: z.string(),
  isFile: z.boolean(),
  isDirectory: z.boolean(),
  changes: z
    .object({
      status: z.enum(["added", "modified", "deleted", "renamed", "untracked"]),
      additions: z.number(),
      deletions: z.number(),
    })
    .optional(),
});

export type FileNode = z.infer<typeof fileNodeSchema>;

/**
 * Create sandbox router with optional procedure builder
 */
export function createSandboxRouter(procedure = publicProcedure) {
  return {
    /**
     * List files and directories in a given path
     */
    list: procedure
      .meta({
        doc: {
          summary: "List files and directories",
          description:
            "Returns a flat list of files and directories with parent-child relationships. Supports recursive scanning.",
          examples: [
            {
              title: "List root directory",
              code: 'await start.api.sandbox.list({ path: "/", recursive: true });',
            },
          ],
        },
      })
      .input(
        z.object({
          path: z
            .string()
            .optional()
            .default("/")
            .describe("The absolute path to list"),
          recursive: z
            .boolean()
            .optional()
            .default(false)
            .describe("Whether to recursively list subdirectories"),
          ignore: z
            .array(z.string())
            .optional()
            .describe("Glob patterns to ignore"),
          threadId: z
            .string()
            .optional()
            .describe(
              "Thread ID to extract file changes from agent operations",
            ),
        }),
      )
      .output(z.array(fileNodeSchema))
      .handler(async ({ input, context, errors }) => {
        try {
          const sandbox = await getSandbox(context);

          // Use sandbox fs.readdir to list directory contents
          const entries = await sandbox.fs.readdir(input.path || "/", {
            recursive: input.recursive,
            ignores: input.ignore,
          });

          // Extract file changes from thread messages if threadId provided
          type FileChange = {
            filePath: string;
            commitHash: string;
            toolName: string;
          };

          const fileChangesMap = new Map<
            string,
            {
              status: "added" | "modified";
              additions: number;
              deletions: number;
              lastCommitHash: string;
            }
          >();

          if (input.threadId) {
            try {
              // Load thread messages
              const memory = await getAdapter(context);
              const messages = await loadThread<AgentStartUIMessage>({
                memory,
                threadId: input.threadId,
              });

              // Extract file operations from messages
              const fileOperations: FileChange[] = [];

              for (const msg of messages) {
                if (msg.role !== "assistant") continue;

                for (const part of msg.parts) {
                  // Type guard for tool parts
                  if (!("type" in part)) continue;

                  // Check tool-result parts
                  if (
                    part.type === "tool-write" ||
                    part.type === "tool-edit" ||
                    part.type === "tool-bash"
                  ) {
                    // Write tool: filePath in metadata
                    if (
                      part.type === "tool-write" &&
                      part.output?.metadata?.commitHash &&
                      part.input.filePath
                    ) {
                      fileOperations.push({
                        filePath: part.input.filePath,
                        commitHash: part.output.metadata.commitHash,
                        toolName: part.type,
                      });
                    }

                    // Edit tool: filePath in corresponding tool-call, commitHash in result
                    if (
                      part.type === "tool-edit" &&
                      part.output?.metadata?.commitHash
                    ) {
                      fileOperations.push({
                        filePath: part.input.filePath,
                        commitHash: part.output?.metadata?.commitHash,
                        toolName: part.type,
                      });
                    }

                    // Bash tool: may modify files but we need to extract from commit
                    if (
                      part.type === "tool-bash" &&
                      part.output?.metadata?.commitHash
                    ) {
                      // We'll handle bash commits separately by getting all files from the commit
                      fileOperations.push({
                        filePath: "__bash__", // Special marker
                        commitHash: part.output.metadata.commitHash,
                        toolName: part.type,
                      });
                    }
                  }
                }
              }

              // Helper to parse diff stat output
              const parseDiffStat = (
                diffStat: string,
              ): { additions: number; deletions: number } => {
                // Try to match full format first: "3 files changed, 44 insertions(+), 401 deletions(-)"
                const fullAdditionsMatch = diffStat.match(/(\d+) insertion/);
                const fullDeletionsMatch = diffStat.match(/(\d+) deletion/);

                if (fullAdditionsMatch || fullDeletionsMatch) {
                  return {
                    additions: fullAdditionsMatch?.[1]
                      ? Number.parseInt(fullAdditionsMatch[1], 10)
                      : 0,
                    deletions: fullDeletionsMatch?.[1]
                      ? Number.parseInt(fullDeletionsMatch[1], 10)
                      : 0,
                  };
                }

                // Try short format: "file.txt | 5 ++---"
                // Look for pattern like "| N +" or just count +/- symbols
                const pipeMatch = diffStat.match(/\|\s*(\d+)\s*([+-]*)/);
                if (pipeMatch) {
                  const changes = pipeMatch[2] || "";
                  const additions = (changes.match(/\+/g) || []).length;
                  const deletions = (changes.match(/-/g) || []).length;
                  return { additions, deletions };
                }

                // Fallback: just count all + and - symbols
                const additions = (diffStat.match(/\+/g) || []).length;
                const deletions = (diffStat.match(/-/g) || []).length;
                return { additions, deletions };
              };

              // Get diff stats for each operation
              for (const op of fileOperations) {
                try {
                  // Special handling for bash tool - get all files from commit
                  if (op.filePath === "__bash__") {
                    // Parse diff output to get all modified files
                    const fullDiff = await sandbox.git.diff({
                      from: `${op.commitHash}^`,
                      to: op.commitHash,
                      stat: true,
                    });

                    // Parse file names from diff stat output
                    // Format: " path/to/file.ts | 5 +++--"
                    if (fullDiff) {
                      const fileLines = fullDiff
                        .split("\n")
                        .filter((line) => line.includes("|"));
                      for (const line of fileLines) {
                        const match = line.match(/^\s*(.+?)\s*\|/);
                        if (match?.[1]) {
                          const fileName = `/${match[1].trim()}`;
                          const { additions, deletions } = parseDiffStat(line);

                          const existing = fileChangesMap.get(fileName);
                          if (existing) {
                            fileChangesMap.set(fileName, {
                              status: "modified",
                              additions: existing.additions + additions,
                              deletions: existing.deletions + deletions,
                              lastCommitHash: op.commitHash,
                            });
                          } else {
                            fileChangesMap.set(fileName, {
                              status: "modified",
                              additions,
                              deletions,
                              lastCommitHash: op.commitHash,
                            });
                          }
                        }
                      }
                    }
                    continue;
                  }

                  // Regular file operation (write/edit)
                  const diffStat = await sandbox.git.diff({
                    from: `${op.commitHash}^`, // Parent commit
                    to: op.commitHash,
                    files: [
                      op.filePath.startsWith("/")
                        ? op.filePath.substring(1)
                        : op.filePath,
                    ],
                    stat: true,
                  });

                  const { additions, deletions } = parseDiffStat(diffStat);

                  // Aggregate changes for the same file
                  const existing = fileChangesMap.get(op.filePath);
                  if (existing) {
                    fileChangesMap.set(op.filePath, {
                      status: "modified",
                      additions: existing.additions + additions,
                      deletions: existing.deletions + deletions,
                      lastCommitHash: op.commitHash,
                    });
                  } else {
                    fileChangesMap.set(op.filePath, {
                      status:
                        op.toolName === "tool-write" ? "added" : "modified",
                      additions,
                      deletions,
                      lastCommitHash: op.commitHash,
                    });
                  }
                } catch (diffError) {
                  console.error(
                    `[sandbox.list] Failed to get diff for ${op.filePath}:`,
                    diffError,
                  );
                  // Still mark file as changed even without stats (skip bash markers)
                  if (op.filePath !== "__bash__") {
                    fileChangesMap.set(op.filePath, {
                      status:
                        op.toolName === "tool-write" ? "added" : "modified",
                      additions: 0,
                      deletions: 0,
                      lastCommitHash: op.commitHash,
                    });
                  }
                }
              }
            } catch (threadError) {
              console.error(
                `[sandbox.list] Failed to load thread messages:`,
                threadError,
              );
              // Continue without changes info
            }
          }

          // Convert to FileNode format
          const fileNodes: FileNode[] = [];
          for (const entry of entries) {
            // Path normalization is now handled at the source (sandbox layer)
            const fullPath = entry.path;
            const parentPath = entry.parentPath;

            // Get changes for this file
            const changes = fileChangesMap.get(fullPath);

            fileNodes.push({
              name: entry.name,
              path: fullPath,
              parentPath,
              isFile: entry.isFile(),
              isDirectory: entry.isDirectory(),
              changes: changes
                ? {
                    status: changes.status,
                    additions: changes.additions,
                    deletions: changes.deletions,
                  }
                : undefined,
            });
          }

          return fileNodes;
        } catch (error) {
          console.error("Failed to list files:", error);
          handleRouterError(error, errors);
        }
      }),
  };
}
