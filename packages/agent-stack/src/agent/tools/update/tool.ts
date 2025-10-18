import { tool } from "ai";
import type { BaseContext } from "@/agent/context";
import {
  type AgentStackToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import { commitChanges } from "@/agent/tools/commit-changes";
import { getRichError } from "@/agent/tools/get-rich-error";
import description from "./description";
import { replace } from "./replacers";

export const update = tool({
  description,
  inputSchema: toolInputSchema.shape.update,
  outputSchema: toolOutputSchema.shape.update,
  async *execute(
    { filePath, oldString, newString, replaceAll },
    { experimental_context: context },
  ) {
    const { sandboxManager } = context as BaseContext;

    yield {
      status: "pending" as const,
      prompt: `Updating file: ${filePath}`,
    } satisfies AgentStackToolOutput["update"];

    try {
      // Validate parameters
      if (!filePath) {
        throw new Error("filePath is required");
      }

      if (oldString === newString) {
        throw new Error("oldString and newString must be different");
      }

      // Handle creating new file (empty oldString)
      if (oldString === "") {
        await sandboxManager.fs.writeFile(filePath, newString, {
          recursive: true,
        });

        const commitHash = await commitChanges(
          sandboxManager,
          filePath,
          "created",
        );

        yield {
          status: "done" as const,
          prompt: `Successfully created file: ${filePath}`,
          metadata: {
            commitHash,
          },
        } satisfies AgentStackToolOutput["update"];
        return;
      }

      // Read existing file
      const fileContent = await sandboxManager.fs.readFile(filePath);
      const content =
        typeof fileContent === "string"
          ? fileContent
          : fileContent.toString("utf-8");

      // Use advanced replacement strategies
      try {
        const modifiedContent = replace(
          content,
          oldString,
          newString,
          replaceAll,
        );

        // Write the modified content back to the file
        await sandboxManager.fs.writeFile(filePath, modifiedContent, {
          recursive: true,
        });

        // Count replacements for better feedback
        const occurrences = content.split(oldString).length - 1;
        const replacements = replaceAll ? occurrences : 1;

        const commitHash = await commitChanges(
          sandboxManager,
          filePath,
          replaceAll && occurrences > 1 ? "updated (replace all)" : "updated",
        );

        yield {
          status: "done" as const,
          prompt: `Successfully replaced ${replacements} occurrence${replacements !== 1 ? "s" : ""} in ${filePath}`,
          metadata: {
            commitHash,
          },
        } satisfies AgentStackToolOutput["update"];
      } catch (replaceError) {
        // Provide more specific error messages
        const errorMessage =
          replaceError instanceof Error
            ? replaceError.message
            : String(replaceError);

        const richError = getRichError({
          action: "update file",
          args: { filePath, oldString, newString, replaceAll },
          error: errorMessage,
        });

        yield {
          status: "error" as const,
          prompt: richError.message,
          error: richError.error,
        } satisfies AgentStackToolOutput["update"];
      }
    } catch (error) {
      const richError = getRichError({
        action: "update file",
        args: { filePath, oldString, newString, replaceAll },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStackToolOutput["update"];
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
