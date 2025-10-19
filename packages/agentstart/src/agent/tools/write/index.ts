import { tool } from "ai";
import type { BaseContext } from "@/agent/context";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import { commitChanges } from "@/agent/tools/commit-changes";
import { getRichError } from "@/agent/tools/get-rich-error";
import description from "./description";

export const write = tool({
  description,
  inputSchema: toolInputSchema.shape.write,
  outputSchema: toolOutputSchema.shape.write,
  async *execute({ filePath, content }, { experimental_context: context }) {
    const { sandbox } = context as BaseContext;

    // Check if file exists
    let exists = false;
    try {
      const stat = await sandbox.fs.stat(filePath);
      exists = stat.isFile();
    } catch {
      // File doesn't exist, which is fine for write operation
      exists = false;
    }

    const action = exists ? "Overwriting" : "Creating";

    yield {
      status: "pending" as const,
      prompt: `${action} file: ${filePath}`,
      metadata: {
        filePath,
        exists,
      },
    } satisfies AgentStartToolOutput["write"];

    try {
      // Validate parameters
      if (!filePath) {
        throw new Error("filePath is required");
      }

      // Ensure directory exists by using recursive option
      await sandbox.fs.writeFile(filePath, content, { recursive: true });

      // Verify the file was written
      try {
        const writtenContent = await sandbox.fs.readFile(filePath);
        const writtenStr =
          typeof writtenContent === "string"
            ? writtenContent
            : writtenContent.toString("utf-8");

        if (writtenStr !== content) {
          throw new Error(
            "File content verification failed - written content doesn't match",
          );
        }
      } catch (verifyError) {
        // Log verification error but don't fail the operation
        console.warn("Could not verify written file:", verifyError);
      }

      const commitHash = await commitChanges(
        sandbox,
        filePath,
        exists ? "overwritten" : "created",
      );

      const successMessage = exists
        ? `File overwritten successfully: ${filePath}`
        : `File created successfully: ${filePath}`;

      yield {
        status: "done" as const,
        prompt: successMessage,
        metadata: {
          filePath,
          exists,
          contentLength: content.length,
          commitHash,
        },
      } satisfies AgentStartToolOutput["write"];
    } catch (error) {
      const richError = getRichError({
        action: exists ? "overwrite file" : "create file",
        args: { filePath, contentLength: content.length },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStartToolOutput["write"];
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
