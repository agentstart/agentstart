/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Todo Write tool execution within the AgentStart runtime.
USAGE: Register the "todo-write" tool when composing the agent configuration to expose this capability.
EXPORTS: todoWrite
FEATURES:
  - Bridges sandbox APIs into the Todo Write workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, agent, tools, todo, write, index, tool, runtime
agent-frontmatter:end */

import { generateUuidFromData } from "@agentstart/utils";
import { tool } from "ai";
import type { BaseContext } from "@/agent/context";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import type { DBTodo } from "@/db";
import description from "./description";

export const todoWrite = tool({
  description,
  inputSchema: toolInputSchema.shape["todo-write"],
  outputSchema: toolOutputSchema.shape["todo-write"],
  async *execute({ todos }, { experimental_context: context }) {
    const { threadId, db } = context as BaseContext;

    // Add IDs to todos that don't have them
    const todosWithIds = todos.map((todo) => ({
      ...todo,
      id: todo.id ?? generateUuidFromData(`${threadId}-${todo.content}`),
      priority: todo.priority,
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
      } satisfies AgentStartToolOutput["todo-write"];
    }

    const now = new Date();
    const document: Omit<DBTodo, "createdAt" | "updatedAt"> = {
      id: generateUuidFromData(threadId),
      threadId,
      todos: todosWithIds,
    };
    await db.upsert({
      model: "todo",
      where: [{ field: "threadId", value: threadId }],
      create: {
        ...document,
        createdAt: now,
        updatedAt: now,
      },
      update: { ...document, updatedAt: now },
    });

    const prompt = `${todos.filter((x) => x.status !== "completed").length} todos:
${JSON.stringify(todos, null, 2)}`;

    yield {
      status: "done" as const,
      metadata: { todos: todosWithIds },
      prompt,
    } satisfies AgentStartToolOutput["todo-write"];
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
