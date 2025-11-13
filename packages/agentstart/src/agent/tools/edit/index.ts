/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Edit tool execution within the AgentStart runtime.
USAGE: Register the "edit" tool when composing the agent configuration to expose this capability.
EXPORTS: edit
FEATURES:
  - Bridges sandbox APIs into the edit workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, agent, tools, edit, index, tool, runtime
agent-frontmatter:end */

import type { RuntimeContext } from "@agentstart/types";
import { tool } from "ai";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import { commitChanges } from "@/agent/tools/commit-changes";
import { getRichError } from "@/agent/tools/get-rich-error";
import description from "./description";
import { replace } from "./replacers";

export const edit = tool({
  description,
  inputSchema: toolInputSchema.shape.edit,
  outputSchema: toolOutputSchema.shape.edit,
  async *execute(
    { filePath, oldString, newString, replaceAll },
    { experimental_context: context },
  ) {
    const { sandbox } = context as RuntimeContext;

    // Check if sandbox is configured
    if (!sandbox) {
      yield {
        status: "error" as const,
        prompt: "Sandbox not configured",
        error: {
          message:
            "Edit tool requires a sandbox to be configured. Please configure a sandbox adapter in your AgentStart options.",
        },
      } satisfies AgentStartToolOutput["edit"];
      return;
    }

    yield {
      status: "pending" as const,
      prompt: `Editing file: ${filePath}`,
    } satisfies AgentStartToolOutput["edit"];

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
        await sandbox.fs.writeFile(filePath, newString, {
          recursive: true,
        });

        const commitHash = await commitChanges(sandbox, filePath, "created");

        yield {
          status: "done" as const,
          prompt: `Successfully created file: ${filePath}`,
          metadata: {
            commitHash,
          },
        } satisfies AgentStartToolOutput["edit"];
        return;
      }

      // Read existing file
      const fileContent = await sandbox.fs.readFile(filePath);
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
        await sandbox.fs.writeFile(filePath, modifiedContent, {
          recursive: true,
        });

        // Count replacements for better feedback
        const occurrences = content.split(oldString).length - 1;
        const replacements = replaceAll ? occurrences : 1;

        const commitHash = await commitChanges(
          sandbox,
          filePath,
          replaceAll && occurrences > 1 ? "edited (replace all)" : "edited",
        );

        yield {
          status: "done" as const,
          prompt: `Successfully replaced ${replacements} occurrence${replacements !== 1 ? "s" : ""} in ${filePath}`,
          metadata: {
            commitHash,
          },
        } satisfies AgentStartToolOutput["edit"];
      } catch (replaceError) {
        // Provide more specific error messages
        const errorMessage =
          replaceError instanceof Error
            ? replaceError.message
            : String(replaceError);

        const richError = getRichError({
          action: "edit file",
          args: { filePath, oldString, newString, replaceAll },
          error: errorMessage,
        });

        yield {
          status: "error" as const,
          prompt: richError.message,
          error: richError.error,
        } satisfies AgentStartToolOutput["edit"];
      }
    } catch (error) {
      const richError = getRichError({
        action: "edit file",
        args: { filePath, oldString, newString, replaceAll },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStartToolOutput["edit"];
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
