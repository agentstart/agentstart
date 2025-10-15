import { tool } from "ai";
import type { BaseContext } from "../../../context";
import {
  type AgentStackToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "../../messages";
import { commitChanges } from "../commit-changes";
import { getRichError } from "../get-rich-error";
import description from "./description.md";

export const multiUpdate = tool({
  description,
  inputSchema: toolInputSchema.shape["multi-update"],
  outputSchema: toolOutputSchema.shape["multi-update"],
  async *execute({ filePath, edits }, { experimental_context: context }) {
    const { sandboxManager } = context as BaseContext;

    yield {
      status: "pending" as const,
      prompt: `Applying ${edits.length} edit${edits.length > 1 ? "s" : ""} to ${filePath}`,
      metadata: {
        filePath: filePath,
        totalEdits: edits.length,
      },
    } satisfies AgentStackToolOutput["multi-update"];

    try {
      // Read the entire file content
      const fileContent = await sandboxManager.fs.readFile(filePath);
      let content =
        typeof fileContent === "string"
          ? fileContent
          : fileContent.toString("utf-8");

      // Track successful edits for reporting
      const appliedEdits: Array<{
        oldString: string;
        newString: string;
        replaceAll?: boolean;
        replacements: number;
      }> = [];

      let hasError = false;

      // Apply each edit in sequence
      for (const [index, edit] of edits.entries()) {
        const editNumber = index + 1;

        // Validate oldString is not empty
        if (!edit.oldString) {
          const richError = getRichError({
            action: "multi-update file",
            args: { filePath, edit, editIndex: index },
            error: `Edit #${editNumber}: oldString cannot be empty`,
          });

          yield {
            status: "error" as const,
            prompt: richError.message,
            error: richError.error,
            metadata: {
              appliedEdits,
              failedEditIndex: index,
            },
          } satisfies AgentStackToolOutput["multi-update"];

          hasError = true;
          break;
        }

        // Check if oldString exists in the current content
        if (!content.includes(edit.oldString)) {
          const richError = getRichError({
            action: "multi-update file",
            args: { filePath, edit, editIndex: index },
            error: `Edit #${editNumber}: The string "${edit.oldString.slice(0, 50)}${
              edit.oldString.length > 50 ? "..." : ""
            }" was not found in the file`,
          });

          yield {
            status: "error" as const,
            prompt: richError.message,
            error: richError.error,
            metadata: {
              appliedEdits,
              failedEditIndex: index,
            },
          } satisfies AgentStackToolOutput["multi-update"];

          hasError = true;
          break;
        }

        // Check if oldString and newString are the same
        if (edit.oldString === edit.newString) {
          const richError = getRichError({
            action: "multi-update file",
            args: { filePath, edit, editIndex: index },
            error: `Edit #${editNumber}: oldString and newString cannot be the same`,
          });

          yield {
            status: "error" as const,
            prompt: richError.message,
            error: richError.error,
            metadata: {
              appliedEdits,
              failedEditIndex: index,
            },
          } satisfies AgentStackToolOutput["multi-update"];

          hasError = true;
          break;
        }

        // Count replacements before applying
        const occurrences = content.split(edit.oldString).length - 1;
        const replacements = edit.replaceAll ? occurrences : 1;

        // Perform the replacement
        if (edit.replaceAll) {
          // Replace all occurrences
          content = content.split(edit.oldString).join(edit.newString);
        } else {
          // Replace only the first occurrence
          const index = content.indexOf(edit.oldString);
          content =
            content.slice(0, index) +
            edit.newString +
            content.slice(index + edit.oldString.length);
        }

        appliedEdits.push({
          oldString: edit.oldString,
          newString: edit.newString,
          replaceAll: edit.replaceAll,
          replacements,
        });
      }

      // Only write file and yield success if no errors occurred
      if (!hasError) {
        // Write the modified content back to the file
        await sandboxManager.fs.writeFile(filePath, content, {
          recursive: true,
        });

        const commitHash = await commitChanges(
          sandboxManager,
          filePath,
          "multi-updated",
        );

        const totalReplacements = appliedEdits.reduce(
          (sum, edit) => sum + edit.replacements,
          0,
        );

        // Build detailed output for each edit
        const editSummary = appliedEdits
          .map((edit, idx) => {
            const replaceType = edit.replaceAll ? "all" : "first";
            return `  Edit #${idx + 1}: ${edit.replacements} replacement${edit.replacements !== 1 ? "s" : ""} (${replaceType})`;
          })
          .join("\n");

        const prompt = `Successfully applied ${edits.length} edit${
          edits.length > 1 ? "s" : ""
        } to ${filePath}\n${editSummary}\nTotal: ${totalReplacements} replacement${
          totalReplacements !== 1 ? "s" : ""
        }`;

        yield {
          status: "done" as const,
          metadata: {
            appliedEdits,
            filePath,
            totalReplacements,
            commitHash,
          },
          prompt,
        } satisfies AgentStackToolOutput["multi-update"];
      }
    } catch (error) {
      const richError = getRichError({
        action: "multi-update file",
        args: { filePath, edits },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStackToolOutput["multi-update"];
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
