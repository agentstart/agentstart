/* agent-frontmatter:start
AGENT: Edit file tool UI component
PURPOSE: Visualize file edit operations with unified diff view
USAGE: <EditFile part={toolPart} />
EXPORTS: EditFile, EditFileProps
FEATURES:
  - Shows unified diff with syntax highlighting
  - Displays file path and operation type (replace/replaceAll)
  - Uses [!code --] and [!code ++] markers for changes
  - Supports replace_all flag visualization
SEARCHABLE: edit tool, file edit ui, code replacement view, diff view
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

  const changes = useMemo(() => {
    if (!input || !input.oldString || !input.newString) return null;

    // Always show as unified diff
    const oldLines = input.oldString.split("\n");
    const newLines = input.newString.split("\n");
    const diffCode = [
      ...oldLines.map((line) => `${line} // [!code --]`),
      ...newLines.map((line) => `${line} // [!code ++]`),
    ].join("\n");

    return (
      <CodeBlock
        code={diffCode}
        language={language}
        showDiff
        className="max-h-[300px] text-xs"
      />
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
