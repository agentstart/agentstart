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

import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
} from "lucide-react";
import type React from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";

const statusOrder = ["inProgress", "pending", "completed"];

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600" />,
  inProgress: <ClockIcon className="h-3.5 w-3.5 animate-pulse text-blue-600" />,
  pending: <CircleIcon className="h-3.5 w-3.5 text-muted-foreground" />,
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

export function Todo({ part: { type, state, output, errorText } }: TodoProps) {
  if (!output) {
    return (
      <Tool>
        <ToolHeader type={type} state={state} />
        <ToolContent>
          <ToolOutput output={null} errorText={errorText} />
        </ToolContent>
      </Tool>
    );
  }

  const todos = output.metadata?.todos || [];

  const groupedTodos = todos.reduce(
    (acc, todo) => {
      if (!acc[todo.status]) {
        acc[todo.status] = [];
      }
      acc[todo.status]!.push(todo);
      return acc;
    },
    {} as Record<string, typeof todos>,
  );

  const todoListContent = errorText ? (
    <div className="flex items-center gap-2 text-red-600">
      <AlertCircleIcon className="h-4 w-4" />
      <span className="text-xs">{errorText}</span>
    </div>
  ) : (
    <>
      {/* Todo Items */}
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

      {todos.length === 0 && (
        <div className="text-muted-foreground text-xs italic">
          No tasks in the list
        </div>
      )}
    </>
  );

  return (
    <Tool>
      <ToolHeader type={type} state={state} />
      <ToolContent>
        <ToolOutput output={todoListContent} errorText={errorText} />
      </ToolContent>
    </Tool>
  );
}
