/* agent-frontmatter:start
AGENT: Glob tool UI component
PURPOSE: Display file pattern matching results from glob tool
USAGE: <Glob part={toolPart} />
EXPORTS: Glob, GlobProps
FEATURES:
  - Renders matched file and directory paths
  - Color-coded icons for files vs directories
  - Shows pattern used and match count
  - Highlights filename vs directory path distinction
SEARCHABLE: glob tool, file pattern match ui, file search results
agent-frontmatter:end */

import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { FileIcon, FolderIcon } from "lucide-react";
import { Tool, ToolContent, ToolHeader, ToolOutput } from "./tool";

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
    if (!Array.isArray(output?.metadata?.matches)) return null;

    const matches = output.metadata.matches as string[];
    const totalMatches =
      typeof output.metadata?.count === "number"
        ? output.metadata.count
        : matches.length;

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
            Found {totalMatches} match{totalMatches !== 1 ? "es" : ""}
          </div>
          {matches.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto border-muted border-l-2 pl-2">
              {matches.slice(0, 100).map((match, index) => (
                <div key={`${match}-${index}`}>{renderMatch(match)}</div>
              ))}
              {matches.length > 100 && (
                <div className="mt-2 text-muted-foreground text-xs">
                  ... and {matches.length - 100} more
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
