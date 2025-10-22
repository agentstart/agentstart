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
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { EyeIcon } from "lucide-react";
import { useMemo } from "react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";

export interface ReadFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "read">>>;
}

export function ReadFile({
  part: { type, state, input, output, errorText },
}: ReadFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;

  const readingRange = useMemo(() => {
    if (input?.offset === undefined && input?.limit === undefined) {
      return null;
    }
    const start = input.offset ?? 0;
    const end = input.limit ? start + input.limit : "end";
    return `Lines ${start + 1} - ${end}`;
  }, [input]);

  const previewContent = () => {
    if (!output?.metadata?.content) return null;
    const lines = output.metadata.content.split("\n");
    const maxLines = 10;
    const preview = lines.slice(0, maxLines).join("\n");
    const hasMore = lines.length > maxLines;
    const language = getLanguageFromFilePath(input.filePath);

    return (
      <div className="mt-2">
        <CodeBlock
          code={preview}
          language={language}
          className="max-h-[300px] overflow-auto p-0 text-xs"
        />
        {hasMore && (
          <span className="mt-1 block text-muted-foreground text-xs">
            ... and {lines.length - maxLines} more lines
          </span>
        )}
      </div>
    );
  };

  return (
    <Tool>
      <ToolHeader type={type} state={state} />
      <ToolContent>
        <ToolOutput
          output={
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <code className="text-xs">{fileName}</code>
                {readingRange && (
                  <span className="text-muted-foreground text-xs">
                    ({readingRange})
                  </span>
                )}
              </div>
              {previewContent()}
            </div>
          }
          errorText={errorText}
        />
      </ToolContent>
    </Tool>
  );
}
