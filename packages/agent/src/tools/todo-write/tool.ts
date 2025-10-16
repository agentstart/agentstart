import { randomUUID } from "node:crypto";
import { tool } from "ai";
import {
  type AgentStackToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "../../messages";
import description from "./description.md";

export const todoWrite = tool({
  description,
  inputSchema: toolInputSchema.shape["todo-write"],
  outputSchema: toolOutputSchema.shape["todo-write"],
  async *execute({ todos }) {
    // Add IDs to todos that don't have them
    const todosWithIds = todos.map((todo) => ({
      ...todo,
      id: todo.id ?? randomUUID(),
      priority: todo.priority || "medium",
    }));

    // Validate that only one task is inProgress
    const inProgressCount = todosWithIds.filter(
      (todo) => todo.status === "inProgress",
    ).length;

    if (inProgressCount > 1) {
      yield {
        status: "error" as const,
        metadata: {
          todos: todosWithIds,
        },
        error: {
          message: "Only one task can be inProgress at a time",
        },
        prompt:
          "Error: Only one task can be inProgress at a time. Please update the status of tasks so that only one is inProgress.",
      } satisfies AgentStackToolOutput["todo-write"];
    }

    // Calculate statistics
    const stats = {
      total: todosWithIds.length,
      completed: todosWithIds.filter((todo) => todo.status === "completed")
        .length,
      inProgress: inProgressCount,
      pending: todosWithIds.filter((todo) => todo.status === "pending").length,
      highPriority: todosWithIds.filter((todo) => todo.priority === "high")
        .length,
      mediumPriority: todosWithIds.filter((todo) => todo.priority === "medium")
        .length,
      lowPriority: todosWithIds.filter((todo) => todo.priority === "low")
        .length,
    };

    // Generate summary message
    const completionPercentage =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    let prompt = `Todo list updated successfully. `;
    prompt += `${stats.total} total task${stats.total !== 1 ? "s" : ""}: `;
    prompt += `${stats.completed} completed (${completionPercentage}%), `;
    prompt += `${stats.inProgress} in progress, `;
    prompt += `${stats.pending} pending.`;

    if (stats.highPriority > 0) {
      prompt += ` ${stats.highPriority} high priority task${
        stats.highPriority !== 1 ? "s" : ""
      }.`;
    }

    yield {
      status: "done" as const,
      metadata: { todos: todosWithIds, stats },
      prompt,
    } satisfies AgentStackToolOutput["todo-write"];
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
