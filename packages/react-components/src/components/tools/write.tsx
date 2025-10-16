import type { Tools } from "@agent-stack/agent";
import { getLanguageFromFilePath } from "@agent-stack/utils";
import type { InferUITools, ToolUIPart } from "ai";
import { FileIcon } from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";

export interface WriteFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "write">>>;
}

export function WriteFile({
  part: { type, state, input, errorText },
}: WriteFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;

  const previewContent = () => {
    if (!input?.content) return null;
    const lines = input.content.split("\n");
    const maxLines = 10;
    const preview = lines.slice(0, maxLines).join("\n");
    const hasMore = lines.length > maxLines;
    const language = getLanguageFromFilePath(input.filePath);

    return (
      <div className="mt-2">
        <CodeBlock
          code={preview}
          language={language}
          className="max-h-[200px] overflow-auto text-xs"
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
            <div>
              <div className="mb-2 flex items-center gap-2">
                <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <code className="text-xs">{fileName}</code>
                {/* {state === "output-available" &&
                  output?.metadata?.commitHash && (
                    <CommitHash hash={output?.metadata?.commitHash} />
                  )} */}
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
