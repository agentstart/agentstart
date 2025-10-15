import { getLanguageFromFilePath } from "@agent-stack/utils";
import type { InferUITools, ToolUIPart } from "ai";
import { FileEditIcon } from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { CommitHash } from "@/components/ai-elements/commit-hash";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { Tools } from "..";

export interface MultiUpdateFileProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "multiUpdate">>>;
}

export function MultiUpdateFile({
  part: { type, state, input, output, errorText },
}: MultiUpdateFileProps) {
  const fileName = input?.filePath?.split("/").pop() || input?.filePath;
  const language = getLanguageFromFilePath(input?.filePath || "");

  const shouldShowCodeBlock = (str: string | undefined) => {
    if (!str) return false;
    return str.includes("\n") || str.length > 50;
  };

  const renderEditPreview = (
    edit:
      | { oldString?: string; newString?: string; replaceAll?: boolean }
      | undefined,
    index: number,
  ) => {
    if (!edit) return null;
    return (
      <div key={index} className="mt-3 border-muted border-l-2 pl-3">
        <div className="mb-1 text-muted-foreground text-xs">
          Edit #{index + 1}
          {edit.replaceAll && " (replace all)"}
        </div>

        {edit.oldString && shouldShowCodeBlock(edit.oldString) ? (
          <div className="mb-2">
            <span className="mb-1 block text-muted-foreground text-xs">
              Before:
            </span>
            <CodeBlock
              code={edit.oldString}
              language={language}
              className="max-h-[100px] overflow-auto text-xs opacity-60"
            />
          </div>
        ) : edit.oldString ? (
          <div className="mb-2 rounded bg-muted/50 p-2 text-muted-foreground text-xs">
            <span className="line-through">{edit.oldString}</span>
          </div>
        ) : null}

        {edit.newString && shouldShowCodeBlock(edit.newString) ? (
          <div>
            <span className="mb-1 block text-green-600 text-xs">After:</span>
            <CodeBlock
              code={edit.newString}
              language={language}
              className="max-h-[100px] overflow-auto text-xs"
            />
          </div>
        ) : edit.newString ? (
          <div className="rounded bg-green-50 p-2 text-green-600 text-xs dark:bg-green-900/20">
            {edit.newString}
          </div>
        ) : null}
      </div>
    );
  };

  const renderAppliedEdit = (
    edit: {
      oldString: string;
      newString: string;
      replaceAll?: boolean;
      replacements: number;
    },
    index: number,
  ) => {
    return (
      <div key={index} className="text-muted-foreground text-xs">
        Edit #{index + 1}: {edit.replacements} replacement
        {edit.replacements !== 1 ? "s" : ""}
        {edit.replaceAll && " (all occurrences)"}
      </div>
    );
  };

  const renderOutput = () => {
    if (!input) return null;

    return (
      <div className="flex flex-col gap-1">
        <div className="mb-2 flex items-center gap-2">
          <FileEditIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <code className="text-xs">{fileName}</code>
          {input.edits && (
            <span className="text-muted-foreground text-xs">
              ({input.edits.length} edit
              {input.edits.length !== 1 ? "s" : ""})
            </span>
          )}
          {state === "output-available" && output?.metadata?.commitHash && (
            <CommitHash hash={output?.metadata?.commitHash} />
          )}
        </div>

        {(state === "input-streaming" || state === "input-available") && (
          <span className="text-muted-foreground text-xs">
            Applying {input.edits?.length || 0} edits...
          </span>
        )}

        {state === "output-available" && output?.metadata?.appliedEdits && (
          <>
            <span className="text-muted-foreground text-xs">
              Successfully applied {output.metadata.appliedEdits.length} edits
            </span>
            <div className="mt-2">
              {output.metadata.appliedEdits.map((edit, index) =>
                renderAppliedEdit(edit, index),
              )}
            </div>
          </>
        )}

        {input.edits &&
          (state === "input-streaming" || state === "input-available") && (
            <div className="mt-2">
              <span className="mb-2 block text-muted-foreground text-xs">
                Preview of edits to apply:
              </span>
              {input.edits
                .slice(0, 3)
                .map((edit, index) => renderEditPreview(edit, index))}
              {input.edits.length > 3 && (
                <span className="mt-2 block text-muted-foreground text-xs">
                  ... and {input.edits.length - 3} more edits
                </span>
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
        <ToolOutput output={renderOutput()} errorText={errorText} />
      </ToolContent>
    </Tool>
  );
}
