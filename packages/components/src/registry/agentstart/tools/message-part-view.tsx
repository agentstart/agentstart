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

import { BrainIcon } from "@phosphor-icons/react";
import type { AgentStartMessagePart } from "agentstart/agent";
import { memo } from "react";
import {
  Reasoning as BaseReasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../reasoning";
import { Response } from "../response";
import { Shimmer } from "../shimmer";
import { Bash } from "./bash";
import { Glob } from "./glob";
import { Grep } from "./grep";
import { Ls } from "./ls";
import { ReadFile } from "./read";
import { Todo } from "./todo";
import { UpdateFile } from "./update";
import { WriteFile } from "./write";

interface Props {
  part: AgentStartMessagePart;
  isStreaming: boolean;
}

export const MessagePart = memo(function MessagePart({
  part,
  isStreaming,
}: Props) {
  switch (part.type) {
    case "tool-read": {
      return <ReadFile part={part} />;
    }
    case "tool-write":
      return <WriteFile part={part} />;
    case "tool-update":
      return <UpdateFile part={part} />;
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
});

function Reasoning({
  className,
  text,
  isStreaming,
}: {
  className?: string;
  text: string;
  isStreaming: boolean;
}) {
  const getThinkingMessage = (isStreaming: boolean, duration?: number) => {
    if (isStreaming || duration === 0) {
      return <Shimmer duration={1}>Thinking...</Shimmer>;
    }
    return duration === undefined ? (
      <p>Thought for a few seconds</p>
    ) : (
      <p>Thought for {duration} seconds</p>
    );
  };

  return (
    <BaseReasoning
      className={className}
      isStreaming={isStreaming}
      defaultOpen={false}
    >
      <ReasoningTrigger>
        <BrainIcon className="size-4" weight="duotone" />
        {getThinkingMessage(isStreaming)}
      </ReasoningTrigger>
      <ReasoningContent>{text}</ReasoningContent>
    </BaseReasoning>
  );
}
