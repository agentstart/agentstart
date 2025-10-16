import type { GitStatus } from "@agent-stack/sandbox";
import { tool } from "ai";
import type { BaseContext } from "../../context";
import {
  type AgentStackToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "../../messages/tool";
import { commitChanges } from "../commit-changes";
import { getRichError } from "../get-rich-error";
import description from "./description.md";

// Constants
const MAX_OUTPUT_LENGTH = 30000; // Maximum output length (30000 characters)
const DEFAULT_TIMEOUT = 120000; // Default timeout (2 minutes)
const MAX_TIMEOUT = 600000; // Maximum timeout (10 minutes)

export const bash = tool({
  description,
  inputSchema: toolInputSchema.shape.bash,
  outputSchema: toolOutputSchema.shape.bash,
  async *execute(
    { command, timeout, description },
    { experimental_context: context },
  ) {
    const { sandboxManager } = context as BaseContext;

    // Calculate effective timeout (not exceeding maximum)
    const effectiveTimeout = Math.min(timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT);

    // Initialize metadata with empty output
    yield {
      status: "pending" as const,
      prompt: `Executing: ${command}`,
      metadata: { description },
    } satisfies AgentStackToolOutput["bash"];

    try {
      // Get git status before executing command
      let statusBefore: GitStatus | null = null;
      try {
        statusBefore = await sandboxManager.git.status();
      } catch {
        // Git not available or not a git repository, skip status check
        statusBefore = null;
      }

      // Execute the command using the Bash adapter
      const result = await sandboxManager.bash.$({
        timeout: effectiveTimeout,
      })`${command}`;

      // Truncate output if it exceeds maximum length
      const truncateOutput = (str: string) => {
        if (str.length > MAX_OUTPUT_LENGTH) {
          return `${str.slice(0, MAX_OUTPUT_LENGTH)}\n\n(Output was truncated due to length limit)`;
        }
        return str;
      };

      // Combine stdout and stderr for output
      const stdout = result.stdout?.toString() || "";
      const stderr = result.stderr?.toString() || "";

      // Check for file changes and commit if necessary
      if (statusBefore !== null && result.exitCode === 0) {
        try {
          const statusAfter = await sandboxManager.git.status();

          // Check if there are new changes
          const hasNewChanges =
            !statusAfter.clean ||
            statusAfter.modified.length > statusBefore.modified.length ||
            statusAfter.staged.length > statusBefore.staged.length ||
            statusAfter.untracked.length > statusBefore.untracked.length ||
            statusAfter.deleted.length > statusBefore.deleted.length ||
            statusAfter.renamed.length > statusBefore.renamed.length;

          if (hasNewChanges) {
            const commitHash = await commitChanges(
              sandboxManager,
              ".", // Use current directory as the path for bash commands
              `executed: ${command.length > 50 ? `${command.substring(0, 50)}...` : command}`,
            );

            yield {
              status: "done" as const,
              metadata: {
                description,
                stdout: truncateOutput(stdout),
                stderr: truncateOutput(stderr),
                exitCode: result.exitCode,
                duration: result.duration,
                commitHash,
              },
              prompt: result.stderr
                ? `Command failed with exit code ${result.exitCode}:\n${stderr || stdout}`
                : stdout || "Command executed successfully (no output)",
            } satisfies AgentStackToolOutput["bash"];
          } else {
            yield {
              status: "done" as const,
              metadata: {
                description,
                stdout: truncateOutput(stdout),
                stderr: truncateOutput(stderr),
                exitCode: result.exitCode,
                duration: result.duration,
              },
              prompt: result.stderr
                ? `Command failed with exit code ${result.exitCode}:\n${stderr || stdout}`
                : stdout || "Command executed successfully (no output)",
            } satisfies AgentStackToolOutput["bash"];
          }
        } catch (commitError) {
          // Log commit error but don't fail the bash operation
          console.warn(
            "Failed to commit changes after bash command:",
            commitError,
          );
          // Still yield the result without commitHash
          yield {
            status: "done" as const,
            metadata: {
              description,
              stdout: truncateOutput(stdout),
              stderr: truncateOutput(stderr),
              exitCode: result.exitCode,
              duration: result.duration,
            },
            prompt: result.stderr
              ? `Command failed with exit code ${result.exitCode}:\n${stderr || stdout}`
              : stdout || "Command executed successfully (no output)",
          } satisfies AgentStackToolOutput["bash"];
        }
      } else {
        // No git or failed command, yield without commit hash
        yield {
          status: "done" as const,
          metadata: {
            description,
            stdout: truncateOutput(stdout),
            stderr: truncateOutput(stderr),
            exitCode: result.exitCode,
            duration: result.duration,
          },
          prompt: result.stderr
            ? `Command failed with exit code ${result.exitCode}:\n${stderr || stdout}`
            : stdout || "Command executed successfully (no output)",
        } satisfies AgentStackToolOutput["bash"];
      }
    } catch (error) {
      const richError = getRichError({
        action: "execute bash command",
        args: { command, timeout: effectiveTimeout },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
        metadata: { description },
      } satisfies AgentStackToolOutput["bash"];
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
