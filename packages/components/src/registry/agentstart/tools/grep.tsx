/* agent-frontmatter:start
AGENT: Grep tool UI component
PURPOSE: Display code search results from grep tool with syntax highlighting
USAGE: <Grep part={toolPart} />
EXPORTS: Grep, GrepProps
FEATURES:
  - Shows search pattern and matched content
  - Supports multiple output modes (content/files/count)
  - Syntax highlighting for matched code lines
  - Displays file paths and line numbers with matches
SEARCHABLE: grep tool, code search ui, content search results
agent-frontmatter:end */

import { FileIcon, HashIcon } from "@phosphor-icons/react";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { CodeBlock } from "../code-block";
import { Tool, ToolContent, ToolHeader, ToolOutput } from "./tool";

export interface GrepProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "grep">>>;
}

export function Grep({
  part: { type, state, input, output, errorText },
}: GrepProps) {
  const getOutputModeLabel = () => {
    switch (input?.outputMode) {
      case "content":
        return "Matching Lines";
      case "count":
        return "Match Counts";
      // case "files_with_matches":
      default:
        return "Matching Files";
    }
  };

  const renderFilesOutput = () => {
    const files = Array.isArray(output?.metadata?.files)
      ? (output.metadata.files as string[])
      : [];
    if (files.length === 0) {
      return (
        <span className="text-muted-foreground text-xs italic">
          No files found with matches
        </span>
      );
    }

    return (
      <div className="mt-2">
        <div className="mb-1 text-muted-foreground text-xs">
          Found in {output?.metadata?.fileCount ?? files.length} file
          {(output?.metadata?.fileCount ?? files.length) !== 1 && "s"}
        </div>
        <div className="max-h-[300px] overflow-y-auto border-muted border-l-2 pl-2">
          {files.slice(0, 100).map((file, index) => (
            <div
              key={`${file}-${index}`}
              className="flex items-center gap-2 py-0.5 text-xs"
            >
              <FileIcon className="size-4" weight="duotone" />
              <span className="font-mono">{file}</span>
            </div>
          ))}
          {files.length > 100 && (
            <div className="mt-2 text-muted-foreground text-xs">
              ... and {files.length - 100} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCountsOutput = () => {
    const counts = Array.isArray(output?.metadata?.counts)
      ? (output.metadata.counts as Array<{ filename: string; count: number }>)
      : [];
    if (counts.length === 0) {
      return (
        <span className="text-muted-foreground text-xs italic">
          No matches found
        </span>
      );
    }

    return (
      <div className="mt-2">
        <div className="mb-1 text-muted-foreground text-xs">
          Total: {output?.metadata?.totalMatches || 0} match
          {(output?.metadata?.totalMatches || 0) !== 1 && "es"} in{" "}
          {counts.length} file{counts.length !== 1 && "s"}
        </div>
        <div className="max-h-[300px] space-y-0.5 overflow-y-auto font-mono text-xs">
          {counts.map((item, index) => (
            <div
              key={`${item.filename}-${index}`}
              className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
            >
              <HashIcon className="size-4" weight="duotone" />
              <span className="w-12 text-right text-blue-600">
                {item.count}
              </span>
              <span>{item.filename}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContentOutput = () => {
    const matches = Array.isArray(output?.metadata?.matches)
      ? (output.metadata.matches as string[])
      : [];
    if (matches.length === 0) {
      return (
        <span className="text-muted-foreground text-xs italic">
          No matching lines found
        </span>
      );
    }

    // Join all matches into a single string for the code block
    const content = matches.join("\n");

    return (
      <div className="mt-2">
        <div className="mb-1 text-muted-foreground text-xs">
          Found {output?.metadata?.matchCount || 0} match
          {(output?.metadata?.matchCount || 0) !== 1 && "es"} in{" "}
          {output?.metadata?.fileCount || 0} file
          {(output?.metadata?.fileCount || 0) !== 1 && "s"}
        </div>
        <CodeBlock
          code={content}
          language="markdown"
          className="max-h-[400px] overflow-auto text-xs"
        />
      </div>
    );
  };

  const renderResults = () => {
    if (!output) return null;

    return (
      <div className="flex flex-col gap-2">
        {/* Pattern and options */}
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
          {input?.outputMode && (
            <div className="text-xs">
              <span className="text-muted-foreground">Mode: </span>
              <span>{getOutputModeLabel()}</span>
            </div>
          )}
        </div>

        {/* Results based on output mode */}
        {input?.outputMode === "files_with_matches" || !input?.outputMode
          ? renderFilesOutput()
          : input?.outputMode === "count"
            ? renderCountsOutput()
            : renderContentOutput()}
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
