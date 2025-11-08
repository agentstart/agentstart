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
import { publicProcedure } from "@/api/procedures";
import { handleRouterError } from "@/api/utils/error-handler";
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

          // Convert to FileNode format
          const fileNodes: FileNode[] = [];
          for (const entry of entries) {
            const fullPath =
              entry.path || `${input.path}/${entry.name}`.replace("//", "/");

            fileNodes.push({
              name: entry.name,
              path: fullPath,
              parentPath: entry.parentPath || input.path || "/",
              isFile: entry.isFile(),
              isDirectory: entry.isDirectory(),
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
