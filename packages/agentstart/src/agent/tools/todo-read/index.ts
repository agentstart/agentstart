import { tool } from "ai";
import type { BaseContext } from "@/agent/context";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import type { DBTodo } from "@/db";
import description from "./description";

export const todoRead = tool({
  description,
  inputSchema: toolInputSchema.shape["todo-read"],
  outputSchema: toolOutputSchema.shape["todo-read"],
  async *execute(_, { experimental_context: context }) {
    const { threadId, db } = context as BaseContext;

    const todos = await db.findOne<DBTodo>({
      model: "todo",
      where: [{ field: "threadId", value: threadId }],
    });

    if (!todos) {
      yield {
        status: "error" as const,
        metadata: { todos: [] },
        error: {
          message: "No todos found for this thread",
        },
        prompt:
          "No todos found for this thread. You can add todos using the todo-write tool.",
      } satisfies AgentStartToolOutput["todo-read"];
      return;
    }

    const prompt = `${todos.todos.filter((x) => x.status !== "completed").length} todos:
${JSON.stringify(todos.todos, null, 2)}`;

    yield {
      status: "done" as const,
      metadata: { todos: todos.todos },
      prompt,
    } satisfies AgentStartToolOutput["todo-read"];
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
