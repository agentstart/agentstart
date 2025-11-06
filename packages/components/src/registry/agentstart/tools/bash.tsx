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

import { CommandIcon } from "@phosphor-icons/react";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CodeBlock } from "../code-block";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

export interface BashProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "bash">>>;
}

export function Bash({ part: { state, input, output } }: BashProps) {
  const hasOutput = output?.metadata?.stdout || output?.metadata?.stderr;
  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };
  const isLoading = ["input-streaming", "input-available"].includes(state);

  const title = useMemo(() => {
    if (!input?.command) return <span>Ran command</span>;
    return (
      <div className="flex w-full items-center gap-2 overflow-hidden">
        Ran command:
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="flex-1 truncate text-left font-mono text-foreground">
                {input?.command}
              </span>
            }
          />
          <TooltipContent align="start">
            <div className="flex flex-col gap-1">
              {input?.description && (
                <span className="text-muted-foreground text-xs">
                  {input.description}
                </span>
              )}

              {/* Exit code and duration */}
              {state === "output-available" && output && (
                <div className="flex items-center gap-4 text-muted-foreground text-xs">
                  {output.metadata?.exitCode !== undefined && (
                    <span
                      className={
                        output.metadata.exitCode === 0
                          ? undefined
                          : "text-yellow-600"
                      }
                    >
                      Exit code: {output.metadata.exitCode}
                    </span>
                  )}
                  {output.metadata?.duration && (
                    <span>
                      Duration: {formatDuration(output.metadata.duration)}
                    </span>
                  )}
                  {/* {output.metadata?.commitHash && (
            <CommitHash hash={output.metadata.commitHash} />
          )} */}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }, [input?.command, input?.description, output, state]);

  return (
    <Steps data-tool-bash>
      <StepsTrigger
        loading={isLoading}
        error={output?.status === "error" || Boolean(output?.error)}
        leftIcon={<CommandIcon weight="duotone" className="size-4" />}
      >
        {title}
      </StepsTrigger>
      <StepsContent>
        <StepsItem>
          <div className="space-x-2">
            <span className="text-sm">$</span>
            <span className="font-mono text-foreground text-sm">
              {input?.command}
            </span>
          </div>
        </StepsItem>

        {/* Status indicators */}
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <span>Executing command...</span>
          </StepsItem>
        )}

        {/* Standard output */}
        {output?.metadata?.stdout && (
          <StepsItem>
            <CodeBlock
              code={output.metadata.stdout}
              language="bash"
              className="max-h-[400px] text-xs"
            />
          </StepsItem>
        )}

        {/* No output message */}
        {state === "output-available" && output && !hasOutput && (
          <StepsItem>Command executed successfully (no output)</StepsItem>
        )}

        {/* Standard error */}
        {output?.metadata?.stderr && (
          <StepsItem>
            <CodeBlock
              code={output.metadata.stderr}
              language="bash"
              className="max-h-[200px] border-red-200 text-xs dark:border-red-900"
            />
          </StepsItem>
        )}
      </StepsContent>
    </Steps>
  );
}
