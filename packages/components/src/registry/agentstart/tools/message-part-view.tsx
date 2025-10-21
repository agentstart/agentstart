/* agent-frontmatter:start
AGENT: Message part view orchestrator
PURPOSE: Route different tool and content types to their specific UI components
USAGE: <MessagePartView message={message} />
EXPORTS: MessagePartView, MessagePartViewProps
FEATURES:
  - Dispatches tool parts to specialized renderers (bash, read, write, etc.)
  - Renders text content with markdown support
  - Handles reasoning blocks with collapsible UI
  - Supports all AgentStart tool visualizations
SEARCHABLE: message view, tool renderer, part dispatcher, ui orchestrator
agent-frontmatter:end */

import type { AgentStartUIMessage, Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { memo } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import { Bash } from "./bash";
import { Glob } from "./glob";
import { Grep } from "./grep";
import { Ls } from "./ls";
import { ReadFile } from "./read";
import { Todo } from "./todo";
import { UpdateFile } from "./update";
import { WriteFile } from "./write";

type ToolPart<K extends keyof Tools> = ToolUIPart<InferUITools<Pick<Tools, K>>>;

interface Props {
  part: AgentStartUIMessage["parts"][number];
  isStreaming: boolean;
}

export const MessagePart = memo(function MessagePart({
  part,
  isStreaming,
}: Props) {
  switch (part.type) {
    case "tool-read":
      return <ReadFile part={part as ToolPart<"read">} />;
    case "tool-write":
      return <WriteFile part={part as ToolPart<"write">} />;
    case "tool-update":
      return <UpdateFile part={part as ToolPart<"update">} />;
    case "tool-bash":
      return <Bash part={part as ToolPart<"bash">} />;
    case "tool-glob":
      return <Glob part={part as ToolPart<"glob">} />;
    case "tool-grep":
      return <Grep part={part as ToolPart<"grep">} />;
    case "tool-ls":
      return <Ls part={part as ToolPart<"ls">} />;
    case "tool-todoRead":
    case "tool-todoWrite":
      return (
        <Todo part={part as ToolPart<"todoWrite"> | ToolPart<"todoRead">} />
      );

    case "reasoning":
      return (
        <Reasoning
          className="w-full"
          isStreaming={isStreaming}
          defaultOpen={false}
        >
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "text":
      return <Response>{part.text}</Response>;
    default:
      return null;
  }
});
