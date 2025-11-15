/* agent-frontmatter:start
AGENT: Tool schema definitions
PURPOSE: Define input and output schemas for all thread tools
USAGE: Import tool schemas and types for thread message tool invocations
EXPORTS: toolInputSchema, toolOutputSchema, ChatToolInput, AgentStartToolOutput, ChatToolSet, ChatMessagePart
FEATURES:
  - Zod schemas for tool inputs and outputs
  - Type inference for tool invocations
  - Comprehensive tool definitions for read, write, edit, bash, ls, glob, grep, etc.
SEARCHABLE: tool schema, tool types, thread tools, zod schemas
agent-frontmatter:end */

import type { InferUITools, UIMessagePart } from "ai";
import z from "zod";
import type { Tools } from "@/agent/tools";
import type { AgentStartDataPart } from "./data-parts";

export const errorSchema = z.object({
  message: z.string(),
});

export const toolInputSchema = z.object({
  // read tool
  read: z.object({
    filePath: z.string().describe("The absolute path to the file to read"),
    offset: z
      .number()
      .optional()
      .describe(
        "The line number to start reading from. Only provide if the file is too large to read at once",
      ),
    limit: z
      .number()
      .optional()
      .describe(
        "The number of lines to read. Only provide if the file is too large to read at once.",
      ),
  }),
  // write tool
  write: z.object({
    filePath: z
      .string()
      .describe(
        "The absolute path to the file to write (must be absolute, not relative)",
      ),
    content: z.string().describe("The content to write to the file"),
  }),
  // edit tool
  edit: z.object({
    filePath: z.string().describe("The absolute path to the file to modify"),
    oldString: z.string().describe("The text to replace"),
    newString: z
      .string()
      .describe(
        "The text to replace it with (must be different from oldString)",
      ),
    replaceAll: z
      .boolean()
      .optional()
      .default(false)
      .describe("Replace all occurrences of oldString (default false)"),
  }),
  // bash tool
  bash: z.object({
    command: z.string().describe("The command to execute"),
    timeout: z
      .number()
      .optional()
      .describe("Optional timeout in milliseconds (max 600000)"),
    description: z
      .string()
      .optional()
      .describe(
        "Clear, concise description of what this command does in 5-10 words",
      ),
  }),
  // ls tool
  ls: z.object({
    path: z
      .string()
      .describe(
        "The absolute path to the directory to list (must be absolute, not relative)",
      ),
    recursive: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to recursively list subdirectories (default: false)"),
    ignore: z
      .array(z.string())
      .optional()
      .describe("List of glob patterns to ignore"),
  }),
  // glob tool
  glob: z.object({
    pattern: z.string().describe("The glob pattern to match files against"),
    path: z
      .string()
      .optional()
      .describe(
        "The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter 'undefined' or 'null' - simply omit it for the default behavior. Must be a valid directory path if provided.",
      ),
  }),
  // grep tool
  grep: z.object({
    pattern: z
      .string()
      .describe(
        "The regular expression pattern to search for in file contents",
      ),
    path: z
      .string()
      .optional()
      .describe(
        "File or directory to search in (rg PATH). Defaults to current working directory.",
      ),
    glob: z
      .string()
      .optional()
      .describe(
        'Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob',
      ),
    outputMode: z
      .enum(["content", "files_with_matches", "count"])
      .optional()
      .default("files_with_matches")
      .describe(
        'Output mode: "content" shows matching lines, "files_with_matches" shows file paths (default), "count" shows match counts',
      ),
    "-B": z
      .number()
      .optional()
      .describe(
        'Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.',
      ),
    "-A": z
      .number()
      .optional()
      .describe(
        'Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.',
      ),
    "-C": z
      .number()
      .optional()
      .describe(
        'Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.',
      ),
    "-n": z
      .boolean()
      .optional()
      .describe(
        'Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise.',
      ),
    "-i": z.boolean().optional().describe("Case insensitive search (rg -i)"),
    type: z
      .string()
      .optional()
      .describe(
        "File type to search (rg --type). Common types: js, py, rust, go, java, etc.",
      ),
    headLimit: z
      .number()
      .optional()
      .describe(
        "Limit output to first N lines/entries. Works across all output modes.",
      ),
    multiline: z
      .boolean()
      .optional()
      .describe(
        "Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.",
      ),
  }),
  // todo-write tool
  "todo-write": z.object({
    todos: z
      .array(
        z.object({
          id: z.string().optional(),
          content: z.string().min(1),
          status: z
            .enum(["pending", "inProgress", "completed", "cancelled"])
            .default("pending"),
          priority: z.enum(["high", "medium", "low"]).default("medium"),
        }),
      )
      .describe("The updated todo list"),
  }),
  // todo-read tool
  "todo-read": z.object({}).describe("Read the current todo list"),
  // screenshot tool
  screenshot: z
    .object({
      waitTime: z
        .number()
        .min(0)
        .max(120000)
        .describe(
          "Optional delay in milliseconds after navigation before capturing the screenshot",
        ),
      viewportWidth: z
        .number()
        .optional()
        .describe("Override the browser viewport width in pixels"),
      viewportHeight: z
        .number()
        .optional()
        .describe("Override the browser viewport height in pixels"),
      theme: z
        .enum(["light", "dark"])
        .optional()
        .describe(
          "Preferred color scheme to emulate while capturing the screenshot",
        ),
    })
    .describe(
      "Capture a screenshot of the active sandbox preview and store it in R2",
    ),
  // web-scrape tool
  "web-scrape": z.object({
    url: z
      .url()
      .describe(
        "The URL to scrape (must be a fully-formed valid URL, e.g., https://example.com)",
      ),
    waitTime: z
      .number()
      .optional()
      .describe(
        "Optional time in milliseconds to wait for page load (default: 3000ms)",
      ),
  }),
});

export const baseToolOutputSchema = z.object({
  status: z.enum(["pending", "done", "error"]),
  prompt: z.string().describe("A agent-readable summary of the tool action"),
  error: errorSchema
    .optional()
    .describe("Error details if the tool action failed"),
});
export const toolOutputSchema = z.object({
  // reading file
  read: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        content: z.string().optional(),
        preview: z.string().optional(),
      })
      .optional(),
  }),
  // writing file
  write: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        filePath: z.string().optional(),
        exists: z.boolean().optional(),
        contentLength: z.number().optional(),
        commitHash: z.string().optional(),
      })
      .optional(),
  }),
  // editing file
  edit: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        commitHash: z.string().optional(),
      })
      .optional(),
  }),
  // todo-write
  "todo-write": z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        todos: z.array(
          z.object({
            id: z.string(),
            content: z.string(),
            status: z.enum(["pending", "inProgress", "completed", "cancelled"]),
            priority: z.enum(["high", "medium", "low"]),
          }),
        ),
      })
      .optional(),
  }),
  // todo-read
  "todo-read": z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        todos: z.array(
          z.object({
            id: z.string(),
            content: z.string(),
            status: z.enum(["pending", "inProgress", "completed", "cancelled"]),
            priority: z.enum(["high", "medium", "low"]),
          }),
        ),
      })
      .optional(),
  }),
  // bash
  bash: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        description: z.string().optional(),
        stdout: z.string().optional(),
        stderr: z.string().optional(),
        exitCode: z.number().optional(),
        duration: z.number().optional(),
        commitHash: z.string().optional(),
      })
      .optional(),
  }),
  // ls
  ls: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        entries: z
          .array(
            z.object({
              name: z.string(),
              path: z.string(),
              parentPath: z.string(),
              type: z.enum(["file", "directory", "symlink"]),
              size: z.number(),
              modifiedTime: z.number(),
              permissions: z.number(),
              isFile: z.boolean(),
              isDirectory: z.boolean(),
            }),
          )
          .optional(),
        count: z.number().optional(),
        rootPath: z.string().optional(),
        truncated: z.boolean().optional(),
      })
      .optional(),
  }),
  // glob
  glob: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        matches: z.array(z.string()).optional(),
        count: z.number().optional(),
        truncated: z.boolean().optional(),
        searchPath: z.string().optional(),
      })
      .optional(),
  }),
  // grep
  grep: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        files: z.array(z.string()).optional(),
        fileCount: z.number().optional(),
        matches: z.array(z.string()).optional(),
        matchCount: z.number().optional(),
        counts: z
          .array(
            z.object({
              filename: z.string(),
              count: z.number(),
            }),
          )
          .optional(),
        totalMatches: z.number().optional(),
        truncated: z.boolean().optional(),
      })
      .optional(),
  }),
  // web-scrape
  "web-scrape": z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        screenshotUrl: z.string().optional(),
        colors: z.array(z.string()).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        markdown: z.string().optional(),
        mediaMap: z.record(z.string(), z.string()).optional(),
        html: z.string().optional(),
      })
      .optional(),
  }),
  // screenshot
  screenshot: z.object({
    ...baseToolOutputSchema.shape,
    metadata: z
      .object({
        screenshotUrl: z.string().optional(),
      })
      .optional(),
  }),
});

export type AgentStartToolInput = z.infer<typeof toolInputSchema>;
export type AgentStartToolOutput = z.infer<typeof toolOutputSchema>;
export type AgentStartToolSet = InferUITools<Tools>;

// Base generic type that users can extend in their codebase
export type BaseMessagePart<ToolSet extends Record<string, any>> =
  UIMessagePart<AgentStartDataPart, ToolSet>;

// Default AgentStartMessagePart (includes all built-in tools)
export type AgentStartMessagePart = BaseMessagePart<AgentStartToolSet>;

/**
 * Utility type to extract a specific tool's message part type.
 * Use this in your custom tool UI components to get proper type safety.
 *
 * @example
 * ```typescript
 * import type { ToolPart } from 'agentstart/agent';
 * import type { generateLink } from './tools/generate-link';
 *
 * type ExtendedToolSet = AgentStartToolSet & {
 *   generateLink: typeof generateLink;
 * };
 *
 * type GenerateLinkPart = ToolPart<'generateLink', ExtendedToolSet>;
 *
 * interface Props {
 *   part: GenerateLinkPart;
 * }
 * ```
 */
export type ToolPart<
  ToolName extends string,
  ToolSet extends Record<string, any>,
> = Extract<BaseMessagePart<ToolSet>, { type: `tool-${ToolName}` }>;

/**
 * Utility type to create an extended tool set by merging built-in tools with custom tools.
 * Use this as a convenience helper when you need to add custom tools to the base set.
 *
 * @example
 * ```typescript
 * import type { ExtendToolSet } from 'agentstart/agent';
 * import type { generateLink } from './tools/generate-link';
 * import type { myCustomTool } from './tools/custom';
 *
 * type MyToolSet = ExtendToolSet<{
 *   generateLink: typeof generateLink;
 *   myCustomTool: typeof myCustomTool;
 * }>;
 * ```
 */
export type ExtendToolSet<CustomTools extends Record<string, any>> =
  AgentStartToolSet & CustomTools;
