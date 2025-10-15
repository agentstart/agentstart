import {
  BrainIcon,
  FileEditIcon,
  FileTextIcon,
  FolderOpenIcon,
  LayersIcon,
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
import type { AgentStackUIMessage } from "../messages";
import { Bash } from "./bash/view";
import { Glob } from "./glob/view";
import { Grep } from "./grep/view";
import { Ls } from "./ls/view";
import { MultiUpdateFile } from "./multi-update/view";
import { ReadFile } from "./read/view";
import { TodoWrite } from "./todo-write/view";
import { UpdateFile } from "./update/view";
import { WriteFile } from "./write/view";

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
          <ReadFile part={part} />
        </TaskItem>
      );
    case "tool-write":
      return (
        <TaskItem icon={FileEditIcon} isLast={isLast}>
          <WriteFile part={part} />
        </TaskItem>
      );
    case "tool-update":
      return (
        <TaskItem icon={FileEditIcon} isLast={isLast}>
          <UpdateFile part={part} />
        </TaskItem>
      );
    case "tool-multiUpdate":
      return (
        <TaskItem icon={LayersIcon} isLast={isLast}>
          <MultiUpdateFile part={part} />
        </TaskItem>
      );
    case "tool-bash":
      return (
        <TaskItem icon={TerminalIcon} isLast={isLast}>
          <Bash part={part} />
        </TaskItem>
      );
    case "tool-glob":
      return (
        <TaskItem icon={SearchIcon} isLast={isLast}>
          <Glob part={part} />
        </TaskItem>
      );
    case "tool-grep":
      return (
        <TaskItem icon={SearchIcon} isLast={isLast}>
          <Grep part={part} />
        </TaskItem>
      );
    case "tool-ls":
      return (
        <TaskItem icon={FolderOpenIcon} isLast={isLast}>
          <Ls part={part} />
        </TaskItem>
      );
    case "tool-todoWrite":
      return (
        <TaskItem icon={ListTodoIcon} isLast={isLast}>
          <TodoWrite part={part} />
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
          <Response>{part.text}</Response>;
        </TaskItem>
      );
    default:
      return null;
  }
});
