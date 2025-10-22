/* agent-frontmatter:start
AGENT: Bash tool UI component
PURPOSE: Display shell command execution results with stdout/stderr output
USAGE: <Bash part={toolPart} />
EXPORTS: Bash, BashProps
FEATURES:
  - Shows executed command with description
  - Renders stdout and stderr with syntax highlighting
  - Displays execution duration and exit code
  - Distinguishes between success and error states
SEARCHABLE: bash tool, shell command ui, terminal output view
agent-frontmatter:end */

import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { ClockIcon } from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";

export interface BashProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "bash">>>;
}

export function Bash({
  part: { type, state, input, output, errorText },
}: BashProps) {
  const hasOutput = output?.metadata?.stdout || output?.metadata?.stderr;

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const renderOutput = () => (
    <div className="flex flex-col gap-2">
      {/* Command and description */}
      <div className="flex flex-col gap-1">
        <div className="rounded bg-muted/50 p-2 font-mono text-xs">
          $ {input?.command}
        </div>
        {input?.description && (
          <span className="text-muted-foreground text-xs">
            {input.description}
          </span>
        )}
      </div>

      {/* Status indicators */}
      {["input-streaming", "input-available"].includes(state) && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <ClockIcon className="h-3 w-3 animate-spin" />
          <span>Executing command...</span>
        </div>
      )}

      {/* Exit code and duration */}
      {state === "output-available" && output && (
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          {output.metadata?.exitCode !== undefined && (
            <span
              className={
                output.metadata.exitCode === 0 ? undefined : "text-yellow-600"
              }
            >
              Exit code: {output.metadata.exitCode}
            </span>
          )}
          {output.metadata?.duration && (
            <span>Duration: {formatDuration(output.metadata.duration)}</span>
          )}
          {/* {output.metadata?.commitHash && (
            <CommitHash hash={output.metadata.commitHash} />
          )} */}
        </div>
      )}

      {/* Standard output */}
      {output?.metadata?.stdout && (
        <div className="mt-2">
          <span className="mb-1 block text-muted-foreground text-xs">
            Output:
          </span>
          <CodeBlock
            code={output.metadata.stdout}
            language="bash"
            className="max-h-[400px] overflow-auto text-xs"
          />
        </div>
      )}

      {/* Standard error */}
      {output?.metadata?.stderr && (
        <div className="mt-2">
          <span className="mb-1 block text-red-600 text-xs">Error output:</span>
          <CodeBlock
            code={output.metadata.stderr}
            language="bash"
            className="max-h-[200px] overflow-auto border-red-200 text-xs dark:border-red-900"
          />
        </div>
      )}

      {/* No output message */}
      {state === "output-available" && output && !hasOutput && (
        <span className="text-muted-foreground text-xs italic">
          Command executed successfully (no output)
        </span>
      )}
    </div>
  );

  return (
    <Tool>
      <ToolHeader type={type} state={state} />
      <ToolContent>
        <ToolOutput output={renderOutput()} errorText={errorText} />
      </ToolContent>
    </Tool>
  );
}
