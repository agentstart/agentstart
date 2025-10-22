/* agent-frontmatter:start
AGENT: Update file tool UI component
PURPOSE: Visualize file edit operations with before/after code snippets
USAGE: <UpdateFile part={toolPart} />
EXPORTS: UpdateFile, UpdateFileProps
FEATURES:
  - Shows old and new string replacements with syntax highlighting
  - Displays file path and operation type (replace/replaceAll)
  - Conditionally renders code blocks for multiline changes
  - Supports replace_all flag visualization
SEARCHABLE: update tool, file edit ui, code replacement view
agent-frontmatter:end */

import { getLanguageFromFilePath } from "@agentstart/utils";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { ReplaceIcon } from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";

export interface UpdateFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "update">>>;
}

export function UpdateFile({
  part: { type, state, input, errorText },
}: UpdateFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;

  const language = getLanguageFromFilePath(input?.filePath || "");

  const shouldShowCodeBlock = (str: string | undefined) =>
    Boolean(str && (str.includes("\n") || str.length > 50));

  const renderChanges = () => {
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
                className="max-h-[150px] overflow-auto text-xs opacity-60"
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
                className="max-h-[150px] overflow-auto text-xs"
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
  };

  return (
    <Tool>
      <ToolHeader type={type} state={state} />
      <ToolContent>
        <ToolOutput
          output={
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ReplaceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <code className="text-xs">{fileName}</code>
                {input?.replaceAll && (
                  <span className="text-muted-foreground text-xs">
                    (replace all)
                  </span>
                )}
                {/* {state === "output-available" &&
                  output?.metadata?.commitHash && (
                    <CommitHash hash={output?.metadata?.commitHash} />
                  )} */}
              </div>
              {renderChanges()}
            </div>
          }
          errorText={errorText}
        />
      </ToolContent>
    </Tool>
  );
}
