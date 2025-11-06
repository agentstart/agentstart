/* agent-frontmatter:start
AGENT: Write file tool UI component
PURPOSE: Display file writing operations with content preview
USAGE: <WriteFile part={toolPart} />
EXPORTS: WriteFile, WriteFileProps
FEATURES:
  - Shows file path and write operation
  - Preview first 10 lines of content with syntax highlighting
  - Indicates when content is truncated
  - Language detection based on file extension
SEARCHABLE: write tool, file creation ui, save file view
agent-frontmatter:end */

import { getLanguageFromFilePath } from "@agentstart/utils";
import { NotePencilIcon } from "@phosphor-icons/react";
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

export interface WriteFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "write">>>;
}

export function WriteFile({ part: { state, input, output } }: WriteFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;
  const fileContent = input?.content?.replace(/\\n/g, "\n");
  const isLoading = ["input-streaming", "input-available"].includes(state);

  const preview = useMemo(() => {
    if (!input || !fileContent) return null;
    const lines = fileContent.split("\n");
    const maxLines = 10;
    const preview = lines.slice(0, maxLines).join("\n");
    const hasMore = lines.length > maxLines;
    const language = getLanguageFromFilePath(input.filePath);

    return (
      <>
        <CodeBlock
          code={preview}
          language={language}
          className="max-h-[200px] text-xs"
        />
        {hasMore && (
          <span className="mt-1 block text-muted-foreground text-xs">
            ... and {lines.length - maxLines} more lines
          </span>
        )}
      </>
    );
  }, [input, fileContent]);

  const title = useMemo(() => {
    if (!input || !fileContent) return null;

    const lineNumber = fileContent.split("\n").length ?? 0;
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<span>{fileName}</span>} />
          {input?.filePath && <TooltipContent>{input.filePath}</TooltipContent>}
        </Tooltip>
        <span className="text-green-600">(new) +{lineNumber}</span>
      </div>
    );
  }, [input, fileName, fileContent]);

  return (
    <Steps data-tool-write>
      <StepsTrigger
        leftIcon={<NotePencilIcon weight="duotone" className="size-4" />}
        loading={isLoading}
      >
        {title}
      </StepsTrigger>
      <StepsContent>
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <Shimmer>Writing file...</Shimmer>
          </StepsItem>
        )}
        {preview && <StepsItem>{preview}</StepsItem>}
        {output?.error?.message && (
          <StepsItem className="text-red-600 text-xs">
            {output.error.message}
          </StepsItem>
        )}
      </StepsContent>
    </Steps>
  );
}
