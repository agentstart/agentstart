/* agent-frontmatter:start
AGENT: Read file tool UI component
PURPOSE: Display file reading operations with syntax-highlighted content
USAGE: <ReadFile part={toolPart} />
EXPORTS: ReadFile, ReadFileProps
FEATURES:
  - Shows file path and reading range (offset/limit)
  - Syntax highlighting based on file extension
  - Displays file content with line numbers
  - Handles partial file reads with range indicators
SEARCHABLE: read tool, file view ui, code viewer
agent-frontmatter:end */

import { getLanguageFromFilePath } from "@agentstart/utils";
import { SunglassesIcon } from "@phosphor-icons/react";
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

export interface ReadFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "read">>>;
}

export function ReadFile({ part: { state, input, output } }: ReadFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;
  const readingRange = useMemo(() => {
    if (input?.offset === undefined && input?.limit === undefined) {
      return null;
    }
    const start = input.offset ?? 0;
    const end = input.limit ? start + input.limit : "end";
    return `Lines ${start + 1} - ${end}`;
  }, [input]);

  const preview = useMemo(() => {
    if (!output?.metadata?.content) return null;
    const lines = output.metadata.content.split("\n");
    const maxLines = 10;
    const preview = lines.slice(0, maxLines).join("\n");
    const hasMore = lines.length > maxLines;
    const language = getLanguageFromFilePath(input?.filePath);

    return (
      <div className="mt-2">
        <CodeBlock
          code={preview}
          language={language}
          className="max-h-[300px] p-0 text-xs"
        />
        {hasMore && (
          <span className="mt-1 block text-muted-foreground text-xs">
            ... and {lines.length - maxLines} more lines
          </span>
        )}
      </div>
    );
  }, [output?.metadata?.content, input?.filePath]);

  const title = useMemo(() => {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="flex items-center gap-2">
              <span>{fileName}</span>
              {readingRange && <span>{readingRange}</span>}
            </div>
          }
        />
        {input?.filePath && <TooltipContent>{input.filePath}</TooltipContent>}
      </Tooltip>
    );
  }, [fileName, readingRange, input?.filePath]);
  const isLoading = ["input-streaming", "input-available"].includes(state);

  return (
    <Steps data-tool-read>
      <StepsTrigger
        leftIcon={<SunglassesIcon weight="duotone" className="size-4" />}
        loading={isLoading}
      >
        {title}
      </StepsTrigger>
      <StepsContent>
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <Shimmer>Reading file...</Shimmer>
          </StepsItem>
        )}
        {readingRange && (
          <StepsItem>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  ({readingRange})
                </span>
              </div>
              {preview}
            </div>
          </StepsItem>
        )}
        {output?.error?.message && (
          <StepsItem className="text-red-600 text-xs">
            {output.error.message}
          </StepsItem>
        )}
      </StepsContent>
    </Steps>
  );
}
