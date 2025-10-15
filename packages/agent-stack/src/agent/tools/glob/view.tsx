import type { InferUITools, ToolUIPart } from "ai";
import { FileIcon, FolderIcon } from "lucide-react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { Tools } from "..";

export interface GlobProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "glob">>>;
}

export function Glob({
  part: { type, state, input, output, errorText },
}: GlobProps) {
  const renderMatch = (match: string) => {
    const isDirectory = match.endsWith("/");
    const cleanPath = isDirectory ? match.slice(0, -1) : match;
    const parts = cleanPath.split("/");
    const fileName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join("/");

    return (
      <div className="flex items-center gap-2 py-0.5 text-xs">
        {isDirectory ? (
          <FolderIcon className="h-3 w-3 text-blue-600" />
        ) : (
          <FileIcon className="h-3 w-3 text-muted-foreground" />
        )}
        <span>
          {dirPath && <span className="text-muted-foreground">{dirPath}/</span>}
          <span className="font-medium">{fileName}</span>
        </span>
      </div>
    );
  };

  const renderResults = () => {
    if (!output?.metadata?.matches) return null;

    return (
      <div className="flex flex-col gap-2">
        {/* Pattern and path */}
        <div className="flex flex-col gap-1">
          <div className="text-xs">
            <span className="text-muted-foreground">Pattern: </span>
            <code className="rounded bg-muted/50 px-1 py-0.5 font-mono">
              {input?.pattern}
            </code>
          </div>
          {input?.path && (
            <div className="text-xs">
              <span className="text-muted-foreground">In: </span>
              <code className="font-mono">{input.path}</code>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mt-1">
          <div className="mb-1 text-muted-foreground text-xs">
            Found {output.metadata?.count || 0} match
            {(output.metadata?.count || 0) !== 1 ? "es" : ""}
          </div>
          {output.metadata.matches.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto border-muted border-l-2 pl-2">
              {output.metadata.matches.slice(0, 100).map((match, index) => (
                <div key={index}>{renderMatch(match)}</div>
              ))}
              {output.metadata.matches.length > 100 && (
                <div className="mt-2 text-muted-foreground text-xs">
                  ... and {output.metadata.matches.length - 100} more
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs italic">
              No files found matching this pattern
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Tool>
      <ToolHeader type={type} state={state} />
      <ToolContent>
        <ToolOutput output={renderResults()} errorText={errorText} />
      </ToolContent>
    </Tool>
  );
}
