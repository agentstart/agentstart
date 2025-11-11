/* agent-frontmatter:start
AGENT: Message part view orchestrator
PURPOSE: Route different tool and content types to their specific UI components
USAGE: <MessagePart part={part} isStreaming={isStreaming} />
EXPORTS: MessagePart
FEATURES:
  - Dispatches tool parts to specialized renderers (bash, read, write, etc.)
  - Renders text content with markdown support
  - Handles reasoning blocks with collapsible UI
  - Supports all AgentStart tool visualizations
SEARCHABLE: message view, tool renderer, part dispatcher, ui orchestrator
agent-frontmatter:end */

import type { AgentStartMessagePart } from "agentstart/agent";
import { memo } from "react";
import isEqual from "react-fast-compare";
import { Response } from "../response";
import { Bash } from "./bash";
import { EditFile } from "./edit";
import { Glob } from "./glob";
import { Grep } from "./grep";
import { Ls } from "./ls";
import { ReadFile } from "./read";
import {
  Reasoning as BaseReasoning,
  getThinkingMessage,
  ReasoningContent,
  ReasoningTrigger,
} from "./reasoning";
import { Todo } from "./todo";
import { WriteFile } from "./write";

interface Props {
  part: AgentStartMessagePart;
  isStreaming: boolean;
}

export const MessagePart = memo<Props>(({ part, isStreaming }) => {
  switch (part.type) {
    case "tool-read": {
      return <ReadFile part={part} />;
    }
    case "tool-write":
      return <WriteFile part={part} />;
    case "tool-edit":
      return <EditFile part={part} />;
    case "tool-bash":
      return <Bash part={part} />;
    case "tool-glob":
      return <Glob part={part} />;
    case "tool-grep":
      return <Grep part={part} />;
    case "tool-ls":
      return <Ls part={part} />;
    case "tool-todoRead":
    case "tool-todoWrite":
      return <Todo part={part} />;

    case "reasoning":
      return (
        <Reasoning
          className="w-full"
          isStreaming={isStreaming}
          text={part.text}
        />
      );
    case "text":
      return <Response>{part.text}</Response>;
    default:
      return null;
  }
}, isEqual);

function Reasoning({
  className,
  text,
  isStreaming,
}: {
  className?: string;
  text: string;
  isStreaming: boolean;
}) {
  return (
    <BaseReasoning
      className={className}
      isStreaming={isStreaming}
      defaultOpen={false}
    >
      <ReasoningTrigger>{getThinkingMessage(isStreaming)}</ReasoningTrigger>
      <ReasoningContent>{text}</ReasoningContent>
    </BaseReasoning>
  );
}
