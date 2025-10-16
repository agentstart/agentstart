import { tool } from "ai";
import type { BaseContext } from "../../context";
import {
  type AgentStackToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "../../messages";
import { getRichError } from "../get-rich-error";
import description from "./description.md";

// Constants
const RESULT_LIMIT = 100; // Maximum number of results to return

export const grep = tool({
  description,
  inputSchema: toolInputSchema.shape.grep,
  outputSchema: toolOutputSchema.shape.grep,
  async *execute(
    {
      pattern,
      path,
      glob,
      outputMode,
      "-B": beforeLines,
      "-A": afterLines,
      "-C": contextLines,
      "-n": showLineNumbers,
      "-i": ignoreCase,
      type,
      headLimit,
      multiline,
    },
    { experimental_context: context },
  ) {
    const { sandboxManager } = context as BaseContext;

    yield {
      status: "pending" as const,
      prompt: `Searching for pattern: ${pattern} in ${path || "current directory"}`,
    } satisfies AgentStackToolOutput["grep"];

    try {
      // Map parameters to bash grep options
      const grepOptions: Parameters<typeof sandboxManager.bash.grep>[1] = {
        path,
        ignoreCase,
        showLineNumbers: outputMode === "content" ? showLineNumbers : false,
        showFilesOnly: outputMode === "files_with_matches",
        maxResults: headLimit,
      };

      // Note: Context lines are specified but not fully supported by the current bash.grep implementation
      // The grep command will receive -C flag but the parser doesn't handle context line markers
      // TODO: Enhance bash.grep to properly parse context lines from grep output
      if (outputMode === "content") {
        if (contextLines !== undefined) {
          grepOptions.context = contextLines;
        } else if (beforeLines !== undefined || afterLines !== undefined) {
          // Use the max of before/after as context
          grepOptions.context = Math.max(beforeLines || 0, afterLines || 0);
        }
      }

      // Add file filtering
      if (glob) {
        grepOptions.include = glob;
      } else if (type) {
        // Map common type patterns
        const typePatterns: Record<string, string> = {
          js: "*.{js,jsx,mjs,cjs}",
          ts: "*.{ts,tsx}",
          py: "*.{py,pyi}",
          rust: "*.{rs,toml}",
          go: "*.{go,mod}",
          java: "*.{java,kt}",
          cpp: "*.{cpp,cc,cxx,hpp,h}",
          c: "*.{c,h}",
          cs: "*.{cs,csx}",
          php: "*.{php,phtml}",
          rb: "*.{rb,erb}",
          swift: "*.{swift,h,m}",
          scala: "*.{scala,sc}",
          html: "*.{html,htm}",
          css: "*.{css,scss,sass,less}",
          json: "*.json",
          yaml: "*.{yaml,yml}",
          xml: "*.{xml,xsd,xsl}",
          md: "*.{md,markdown}",
          sql: "*.{sql,psql}",
        };
        grepOptions.include = typePatterns[type] || `*.${type}`;
      }

      // Handle multiline mode
      if (multiline) {
        grepOptions.recursive = true;
      }

      // Execute grep search
      const result = await sandboxManager.bash.grep(pattern, grepOptions);

      // Format output based on mode
      let output = "";
      let matchCount = 0;
      let fileCount = 0;
      let truncated = false;

      if (outputMode === "files_with_matches") {
        fileCount = result.files.length;
        const limit = headLimit || RESULT_LIMIT;
        truncated = fileCount > limit;
        const files = result.files.slice(0, limit);

        if (fileCount === 0) {
          output = "No files found";
        } else {
          const lines = files.map((f) => f.filename);
          if (truncated) {
            lines.push("");
            lines.push(
              "(Results are truncated. Consider using a more specific path or pattern.)",
            );
          }
          output = lines.join("\n");
        }

        yield {
          status: "done" as const,
          metadata: {
            files: files.map((f) => f.filename),
            fileCount,
            truncated,
          },
          prompt: fileCount === 0 ? "No files found" : output,
        } satisfies AgentStackToolOutput["grep"];
      } else if (outputMode === "count") {
        fileCount = result.files.length;
        const limit = headLimit || RESULT_LIMIT;
        truncated = fileCount > limit;
        const counts = result.files.slice(0, limit);
        matchCount = result.totalMatches || 0;

        if (fileCount === 0) {
          output = "No files found";
        } else {
          const lines = counts.map((f) => `${f.filename}:${f.matchCount}`);
          if (truncated) {
            lines.push("");
            lines.push(
              "(Results are truncated. Consider using a more specific path or pattern.)",
            );
          }
          output = lines.join("\n");
        }

        yield {
          status: "done" as const,
          metadata: {
            counts: counts.map((f) => ({
              filename: f.filename,
              count: f.matchCount || 0,
            })),
            totalMatches: matchCount,
            truncated,
          },
          prompt:
            fileCount === 0
              ? "No files found"
              : `Found ${matchCount} total match${
                  matchCount !== 1 ? "es" : ""
                } in ${fileCount} file${fileCount !== 1 ? "s" : ""}:\n${output}`,
        } satisfies AgentStackToolOutput["grep"];
      } else {
        // content mode
        const lines: string[] = [];
        let lineCount = 0;
        const limit = headLimit || RESULT_LIMIT;

        for (const file of result.files) {
          if (lineCount >= limit) {
            truncated = true;
            break;
          }

          if (file.matches) {
            for (const match of file.matches) {
              if (lineCount >= limit) {
                truncated = true;
                break;
              }

              // Format the matched line
              let line = "";
              if (showLineNumbers && match.lineNumber) {
                line = `${file.filename}:${match.lineNumber}:${match.line}`;
              } else {
                line = `${file.filename}:${match.line}`;
              }

              // Add the matched line
              // Note: Context lines from grep -C are included in the matches but not separately identified
              // The bash.grep implementation includes them as regular matches
              lines.push(line);

              lineCount++;
            }
          }
        }

        if (lines.length === 0) {
          output = "No files found";
        } else {
          if (truncated) {
            lines.push("");
            lines.push(
              "(Results are truncated. Consider using a more specific path or pattern.)",
            );
          }
          output = lines.join("\n");
        }

        fileCount = result.files.length;
        matchCount = lineCount;

        yield {
          status: "done" as const,
          metadata: {
            matches: lines.slice(0, limit), // Don't include truncation message in matches
            matchCount,
            fileCount,
            truncated,
          },
          prompt: lines.length === 0 ? "No files found" : output,
        } satisfies AgentStackToolOutput["grep"];
      }
    } catch (error) {
      const richError = getRichError({
        action: "grep search",
        args: {
          pattern,
          path,
          outputMode,
        },
        error,
      });

      yield {
        status: "error" as const,
        prompt: richError.message,
        error: richError.error,
      } satisfies AgentStackToolOutput["grep"];
    }
  },
  toModelOutput: (output) => {
    if (output.error) {
      return {
        type: "error-text" as const,
        value: output.prompt,
      };
    }

    return {
      type: "text" as const,
      value: output.prompt,
    };
  },
});
