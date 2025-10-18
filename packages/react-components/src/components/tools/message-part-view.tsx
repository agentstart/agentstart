import type { AgentStackUIMessage, Tools } from "agent-stack/agent";
import type { InferUITools, ToolUIPart } from "ai";
import {
  BrainIcon,
  FileEditIcon,
  FileTextIcon,
  FolderOpenIcon,
  ListTodoIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import { memo } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import { TaskItem } from "@/components/ai-elements/task";
import { Bash } from "./bash";
import { Glob } from "./glob";
import { Grep } from "./grep";
import { Ls } from "./ls";
import { ReadFile } from "./read";
import { TodoWrite } from "./todo-write";
import { UpdateFile } from "./update";
import { WriteFile } from "./write";

type ToolPart<K extends keyof Tools> = ToolUIPart<InferUITools<Pick<Tools, K>>>;

interface Props {
  part: AgentStackUIMessage["parts"][number];
  isStreaming: boolean;
  isLast?: boolean;
}

export const MessagePart = memo(function MessagePart({
  part,
  isStreaming,
  isLast = false,
}: Props) {
  switch (part.type) {
    case "tool-read":
      return (
        <TaskItem icon={FileTextIcon} isLast={isLast}>
          <ReadFile part={part as ToolPart<"read">} />
        </TaskItem>
      );
    case "tool-write":
      return (
        <TaskItem icon={FileEditIcon} isLast={isLast}>
          <WriteFile part={part as ToolPart<"write">} />
        </TaskItem>
      );
    case "tool-update":
      return (
        <TaskItem icon={FileEditIcon} isLast={isLast}>
          <UpdateFile part={part as ToolPart<"update">} />
        </TaskItem>
      );
    case "tool-bash":
      return (
        <TaskItem icon={TerminalIcon} isLast={isLast}>
          <Bash part={part as ToolPart<"bash">} />
        </TaskItem>
      );
    case "tool-glob":
      return (
        <TaskItem icon={SearchIcon} isLast={isLast}>
          <Glob part={part as ToolPart<"glob">} />
        </TaskItem>
      );
    case "tool-grep":
      return (
        <TaskItem icon={SearchIcon} isLast={isLast}>
          <Grep part={part as ToolPart<"grep">} />
        </TaskItem>
      );
    case "tool-ls":
      return (
        <TaskItem icon={FolderOpenIcon} isLast={isLast}>
          <Ls part={part as ToolPart<"ls">} />
        </TaskItem>
      );
    case "tool-todoWrite":
      return (
        <TaskItem icon={ListTodoIcon} isLast={isLast}>
          <TodoWrite part={part as ToolPart<"todoWrite">} />
        </TaskItem>
      );

    case "reasoning":
      return (
        <TaskItem icon={BrainIcon} isLast={isLast}>
          <Reasoning
            className="w-full"
            isStreaming={isStreaming}
            defaultOpen={false}
          >
            <ReasoningTrigger />
            <ReasoningContent>{part.text}</ReasoningContent>
          </Reasoning>
        </TaskItem>
      );
    case "text":
      return (
        <TaskItem isLast={isLast}>
          <Response>{part.text}</Response>
        </TaskItem>
      );
    default:
      return null;
  }
});
