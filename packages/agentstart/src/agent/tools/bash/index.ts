/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Bash tool execution within the AgentStart runtime.
USAGE: Register the "bash" tool when composing the agent configuration to expose this capability.
EXPORTS: bash
FEATURES:
  - Bridges sandbox APIs into the Bash workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, agent, tools, bash, index, tool, runtime
agent-frontmatter:end */

import type { GitStatus, RuntimeContext } from "@agentstart/types";
import { tool } from "ai";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages/tool";
import { commitChanges } from "@/agent/tools/commit-changes";
import { getRichError } from "@/agent/tools/get-rich-error";
import description from "./description";

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
    const { sandbox } = context as RuntimeContext;

    // Check if sandbox is configured
    if (!sandbox) {
      yield {
        status: "error" as const,
        prompt: "Sandbox not configured",
        error: {
          message:
            "Bash tool requires a sandbox to be configured. Please configure a sandbox adapter in your AgentStart options.",
        },
      } satisfies AgentStartToolOutput["bash"];
      return;
    }

    // Calculate effective timeout (not exceeding maximum)
    const effectiveTimeout = Math.min(timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT);

    // Initialize metadata with empty output
    yield {
      status: "pending" as const,
      prompt: `Executing: ${command}`,
      metadata: { description },
    } satisfies AgentStartToolOutput["bash"];

    try {
      // Get git status before executing command
      let statusBefore: GitStatus | null = null;
      try {
        statusBefore = await sandbox.git.status();
      } catch {
        // Git not available or not a git repository, skip status check
        statusBefore = null;
      }

      // Execute the command using the Bash adapter
      const result = await sandbox.bash.$({
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
          const statusAfter = await sandbox.git.status();

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
              sandbox,
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
            } satisfies AgentStartToolOutput["bash"];
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
            } satisfies AgentStartToolOutput["bash"];
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
          } satisfies AgentStartToolOutput["bash"];
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
        } satisfies AgentStartToolOutput["bash"];
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
      } satisfies AgentStartToolOutput["bash"];
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
