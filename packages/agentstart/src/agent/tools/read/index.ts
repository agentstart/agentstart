/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Read tool execution within the AgentStart runtime.
USAGE: Register the "read" tool when composing the agent configuration to expose this capability.
EXPORTS: read
FEATURES:
  - Bridges sandbox APIs into the Read workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, agent, tools, read, index, tool, runtime
agent-frontmatter:end */

import type { RuntimeContext } from "@agentstart/types";
import { tool } from "ai";
import path from "pathe";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import { getRichError } from "@/agent/tools/get-rich-error";
import description from "./description";

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;

// Common binary file extensions
const BINARY_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".exe",
  ".dll",
  ".so",
  ".class",
  ".jar",
  ".war",
  ".7z",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
  ".bin",
  ".dat",
  ".obj",
  ".o",
  ".a",
  ".lib",
  ".wasm",
  ".pyc",
  ".pyo",
  ".pdf",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".wav",
]);

// Image file extensions
const IMAGE_EXTENSIONS: Record<string, string> = {
  ".jpg": "JPEG",
  ".jpeg": "JPEG",
  ".png": "PNG",
  ".gif": "GIF",
  ".bmp": "BMP",
  ".webp": "WebP",
  ".svg": "SVG",
  ".ico": "Icon",
};

export const read = tool({
  description,
  inputSchema: toolInputSchema.shape.read,
  outputSchema: toolOutputSchema.shape.read,
  async *execute(input, { experimental_context: context }) {
    const { sandbox } = context as RuntimeContext;

    // Check if sandbox is configured
    if (!sandbox) {
      yield {
        status: "error" as const,
        prompt: "Sandbox not configured",
        error: {
          message:
            "Read tool requires a sandbox to be configured. Please configure a sandbox adapter in your AgentStart options.",
        },
      } satisfies AgentStartToolOutput["read"];
      return;
    }

    yield {
      status: "pending" as const,
      prompt: `Reading file: ${input.filePath}`,
    } satisfies AgentStartToolOutput["read"];

    try {
      // Check if file exists
      let stat: Awaited<ReturnType<typeof sandbox.fs.stat>>;
      try {
        stat = await sandbox.fs.stat(input.filePath);
      } catch {
        // File doesn't exist, provide suggestions
        const dir = path.dirname(input.filePath);
        const base = path.basename(input.filePath);

        try {
          const dirEntries = await sandbox.fs.readdir(dir);
          const suggestions = dirEntries
            .filter(
              (entry) =>
                entry.name.toLowerCase().includes(base.toLowerCase()) ||
                base.toLowerCase().includes(entry.name.toLowerCase()),
            )
            .map((entry) => path.join(dir, entry.name))
            .slice(0, 3);

          if (suggestions.length > 0) {
            throw new Error(
              `File not found: ${input.filePath}\n\nDid you mean one of these?\n${suggestions.join("\n")}`,
            );
          }
        } catch {
          // Directory doesn't exist or can't be read
        }

        throw new Error(`File not found: ${input.filePath}`);
      }
      // Check if it's a file
      if (!stat.isFile()) {
        if (stat.isDirectory()) {
          throw new Error(`Path is a directory, not a file: ${input.filePath}`);
        }
        throw new Error(`Path is not a regular file: ${input.filePath}`);
      }

      // Check for image files
      const ext = path.extname(input.filePath).toLowerCase();
      const imageType = IMAGE_EXTENSIONS[ext];
      if (imageType) {
        throw new Error(
          `This is an image file of type: ${imageType}\nUse a different tool to process images`,
        );
      }

      // Check for binary files by extension
      if (BINARY_EXTENSIONS.has(ext)) {
        throw new Error(`Cannot read binary file: ${input.filePath}`);
      }

      // Read the file content
      const fileContent = await sandbox.fs.readFile(input.filePath);
      let fileContentRaw: string;

      // Handle different content types
      if (typeof fileContent === "string") {
        fileContentRaw = fileContent;
      } else if (Buffer.isBuffer(fileContent)) {
        // Check for binary content by examining first bytes
        if (await isBinaryContent(fileContent)) {
          throw new Error(`Cannot read binary file: ${input.filePath}`);
        }
        fileContentRaw = fileContent.toString("utf-8");
      } else {
        fileContentRaw = fileContent;
      }

      // Process the file content with offset and limit
      const limit = input.limit ?? DEFAULT_READ_LIMIT;
      const offset = input.offset || 0;
      const lines = fileContentRaw.split("\n");

      // Slice the lines based on offset and limit, and prepare the output
      const raw = lines.slice(offset, offset + limit).map((line) => {
        return line.length > MAX_LINE_LENGTH
          ? `${line.substring(0, MAX_LINE_LENGTH)}...`
          : line;
      });
      const content = raw.map((line, index) => {
        return `${(index + offset + 1).toString().padStart(5, "0")}| ${line}`;
      });

      // Prepare the final output
      let prompt = "<file>\n";
      prompt += content.join("\n");
      if (lines.length > offset + content.length) {
        prompt += `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${offset + content.length})`;
      }
      prompt += "\n</file>";

      // Create preview (first 20 lines)
      const preview = raw.slice(0, 20).join("\n");

      yield {
        status: "done" as const,
        metadata: {
          content: fileContentRaw,
          preview,
        },
        prompt,
      } satisfies AgentStartToolOutput["read"];
    } catch (error) {
      const richError = getRichError({
        action: "read file",
        args: input,
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStartToolOutput["read"];
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

/**
 * Check if buffer contains binary content
 * @param buffer - The buffer to check
 * @returns true if the buffer appears to contain binary data
 */
async function isBinaryContent(buffer: Buffer): Promise<boolean> {
  if (buffer.length === 0) return false;

  const bufferSize = Math.min(4096, buffer.length);
  const bytes = buffer.subarray(0, bufferSize);

  let nonPrintableCount = 0;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) continue;

    // Null bytes are a strong indicator of binary content
    if (byte === 0) return true;
    // Count non-printable characters (excluding common whitespace)
    if (byte < 9 || (byte > 13 && byte < 32)) {
      nonPrintableCount++;
    }
  }

  // If >30% non-printable characters, consider it binary
  return nonPrintableCount / bytes.length > 0.3;
}
