/* agent-frontmatter:start
AGENT: Todo tool UI component
PURPOSE: Display task list from todo tool with status indicators
USAGE: <Todo part={toolPart} />
EXPORTS: Todo, TodoProps
FEATURES:
  - Shows todos grouped by status (inProgress, pending, completed)
  - Color-coded status icons (blue pulse, gray circle, green check)
  - Displays active/pending forms for each task
  - Error state visualization for failed operations
SEARCHABLE: todo tool, task list ui, progress tracker
agent-frontmatter:end */

import {
  CheckIcon,
  CircleIcon,
  ClockIcon,
  KanbanIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import type React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Shimmer } from "../shimmer";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

const statusOrder = ["inProgress", "pending", "completed"];

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckIcon className="size-3.5 text-green-600" />,
  inProgress: <ClockIcon className="size-3.5 animate-pulse text-blue-600" />,
  pending: <CircleIcon className="size-3.5 text-muted-foreground" />,
};

const getStatusIcon = (status: string) => statusIcons[status] ?? null;

const priorityColors: Record<string, string> = {
  high: "text-red-600",
  medium: "text-yellow-600",
  low: "text-muted-foreground",
};

const getPriorityColor = (priority: string) =>
  priorityColors[priority] ?? "text-muted-foreground";

const priorityBadges: Record<string, string> = {
  high: "⚡",
  medium: "•",
  low: "○",
};

const getPriorityBadge = (priority: string) => (
  <span className={cn("text-xs", getPriorityColor(priority))}>
    {priorityBadges[priority] ?? ""}
  </span>
);

export interface TodoProps {
  part:
    | ToolUIPart<InferUITools<Pick<Tools, "todoRead">>>
    | ToolUIPart<InferUITools<Pick<Tools, "todoWrite">>>;
}

export function Todo({ part: { state, output, errorText } }: TodoProps) {
  const isLoading = ["input-streaming", "input-available"].includes(state);

  const todos = output?.metadata?.todos || [];

  const groupedTodos = todos.reduce(
    (acc, todo) => {
      const group = acc[todo.status] || [];
      return {
        ...acc,
        [todo.status]: [...group, todo],
      };
    },
    {} as Record<string, typeof todos>,
  );

  const todoListContent = useMemo(() => {
    if (output?.error) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <WarningIcon className="size-4" weight="duotone" />
          <span className="text-xs">{output.prompt}</span>
        </div>
      );
    }

    if (!output) {
      return null;
    }

    if (todos.length === 0) {
      return (
        <div className="text-muted-foreground text-xs italic">
          No tasks in the list
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {statusOrder.map((status) => {
          const statusTodos = groupedTodos[status];
          if (!statusTodos || statusTodos.length === 0) return null;

          return (
            <div key={status}>
              <div className="mb-1 font-medium text-muted-foreground text-xs capitalize">
                {status.replace("_", " ")}
              </div>
              <div className="space-y-1">
                {statusTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={cn(
                      "flex items-start gap-2 rounded-sm p-1.5 text-xs transition-colors",
                      todo.status === "completed" && "opacity-60",
                      todo.status === "inProgress" &&
                        "bg-blue-50 dark:bg-blue-900/20",
                      todo.priority === "high" &&
                        todo.status !== "completed" &&
                        "bg-red-50 dark:bg-red-900/10",
                    )}
                  >
                    {getStatusIcon(todo.status)}
                    <div className="flex-1">
                      <span
                        className={cn(
                          todo.status === "completed" && "line-through",
                        )}
                      >
                        {todo.content}
                      </span>
                    </div>
                    {getPriorityBadge(todo.priority)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [output, todos.length, groupedTodos]);

  return (
    <Steps data-tool-todo>
      <StepsTrigger
        leftIcon={<KanbanIcon weight="duotone" className="size-4" />}
        loading={isLoading}
        error={output?.status === "error" || Boolean(output?.error)}
      >
        <span>Task List</span>
      </StepsTrigger>
      <StepsContent>
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <Shimmer>
              {output ? "Updating tasks..." : "Loading tasks..."}
            </Shimmer>
          </StepsItem>
        )}
        {errorText && (
          <StepsItem className="text-red-600 text-xs">{errorText}</StepsItem>
        )}
        {todoListContent && <StepsItem>{todoListContent}</StepsItem>}
      </StepsContent>
    </Steps>
  );
}
