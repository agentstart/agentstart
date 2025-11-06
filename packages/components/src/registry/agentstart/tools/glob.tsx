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

import {
  FileIcon,
  FileMagnifyingGlassIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { useCallback, useMemo } from "react";
import { Shimmer } from "../shimmer";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

export interface GlobProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "glob">>>;
}

export function Glob({ part: { state, input, output } }: GlobProps) {
  const isLoading = ["input-streaming", "input-available"].includes(state);

  const renderMatch = useCallback((match: string) => {
    const isDirectory = match.endsWith("/");
    const cleanPath = isDirectory ? match.slice(0, -1) : match;
    const parts = cleanPath.split("/");
    const fileName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join("/");

    return (
      <div className="flex items-center gap-2 py-0.5 text-xs">
        {isDirectory ? (
          <FolderIcon className="size-4" weight="duotone" />
        ) : (
          <FileIcon className="size-4" weight="duotone" />
        )}
        <span>
          {dirPath && <span className="text-muted-foreground">{dirPath}/</span>}
          <span className="font-medium">{fileName}</span>
        </span>
      </div>
    );
  }, []);

  const results = useMemo(() => {
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
  }, [input?.path, input?.pattern, output?.metadata, renderMatch]);

  return (
    <Steps data-tool-glob>
      <StepsTrigger
        leftIcon={
          <FileMagnifyingGlassIcon weight="duotone" className="size-4" />
        }
        loading={isLoading}
      >
        <div className="flex items-center gap-2">
          <span>Glob pattern: </span>
          <code className="rounded bg-muted/50 px-1 py-0.5 font-mono text-xs">
            {input?.pattern}
          </code>
        </div>
      </StepsTrigger>
      <StepsContent>
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <Shimmer>Searching files...</Shimmer>
          </StepsItem>
        )}
        {results && <StepsItem>{results}</StepsItem>}
        {output?.error?.message && (
          <StepsItem className="text-red-600 text-xs">
            {output.error.message}
          </StepsItem>
        )}
      </StepsContent>
    </Steps>
  );
}
