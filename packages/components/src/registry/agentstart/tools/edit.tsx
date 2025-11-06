/* agent-frontmatter:start
AGENT: Edit file tool UI component
PURPOSE: Visualize file edit operations with before/after code snippets
USAGE: <EditFile part={toolPart} />
EXPORTS: EditFile, EditFileProps
FEATURES:
  - Shows old and new string replacements with syntax highlighting
  - Displays file path and operation type (replace/replaceAll)
  - Conditionally renders code blocks for multiline changes
  - Supports replace_all flag visualization
SEARCHABLE: edit tool, file edit ui, code replacement view
agent-frontmatter:end */

import { getLanguageFromFilePath } from "@agentstart/utils";
import { SwapIcon } from "@phosphor-icons/react";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CodeBlock } from "../code-block";
import { Shimmer } from "../shimmer";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

export interface EditFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "edit">>>;
}

export function EditFile({ part: { state, input, output } }: EditFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;

  const language = getLanguageFromFilePath(input?.filePath || "");

  const isLoading = ["input-streaming", "input-available"].includes(state);

  const shouldShowCodeBlock = (str: string | undefined) =>
    Boolean(str && (str.includes("\n") || str.length > 50));

  const changes = useMemo(() => {
    if (!input) return null;

    return (
      <div className="space-y-3">
        {input.oldString && (
          <div>
            <span className="mb-1 block text-muted-foreground text-xs">
              Before:
            </span>
            {shouldShowCodeBlock(input.oldString) ? (
              <CodeBlock
                code={input.oldString}
                language={language}
                className="max-h-[150px] text-xs opacity-60"
              />
            ) : (
              <div className="rounded bg-muted/50 p-2 text-muted-foreground text-xs">
                <span className="line-through">{input.oldString}</span>
              </div>
            )}
          </div>
        )}

        {input.newString && (
          <div>
            <span className="mb-1 block text-green-600 text-xs">After:</span>
            {shouldShowCodeBlock(input.newString) ? (
              <CodeBlock
                code={input.newString}
                language={language}
                className="max-h-[150px] text-xs"
              />
            ) : (
              <div className="rounded bg-green-50 p-2 text-green-600 text-xs dark:bg-green-900/20">
                {input.newString}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [input, language]);

  return (
    <Steps data-tool-edit>
      <StepsTrigger
        leftIcon={<SwapIcon weight="duotone" className="size-4" />}
        loading={isLoading}
        error={output?.status === "error" || Boolean(output?.error)}
      >
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={<code className="text-xs">{fileName}</code>}
            />
            {input?.filePath && (
              <TooltipContent>{input.filePath}</TooltipContent>
            )}
          </Tooltip>
          {input?.replaceAll && (
            <span className="text-muted-foreground text-xs">(replace all)</span>
          )}
        </div>
      </StepsTrigger>
      <StepsContent>
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <Shimmer>Editing file...</Shimmer>
          </StepsItem>
        )}
        <StepsItem>
          <div className="flex items-center gap-2">
            <code className="text-xs">{fileName}</code>
            {input?.replaceAll && (
              <span className="text-muted-foreground text-xs">
                (replace all)
              </span>
            )}
          </div>
        </StepsItem>
        {changes && <StepsItem>{changes}</StepsItem>}
        {output?.error?.message && (
          <StepsItem className="text-red-600 text-xs">
            {output.error.message}
          </StepsItem>
        )}
      </StepsContent>
    </Steps>
  );
}
