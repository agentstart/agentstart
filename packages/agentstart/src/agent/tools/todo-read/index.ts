/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Todo Read tool execution within the AgentStart runtime.
USAGE: Register the "todo-read" tool when composing the agent configuration to expose this capability.
EXPORTS: todoRead
FEATURES:
  - Bridges sandbox APIs into the Todo Read workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, agent, tools, todo, read, index, tool, runtime
agent-frontmatter:end */

import type { RuntimeContext } from "@agentstart/types";
import { tool } from "ai";
import {
  type AgentStartToolOutput,
  toolInputSchema,
  toolOutputSchema,
} from "@/agent/messages";
import type { DBTodo } from "@/memory";
import description from "./description";

export const todoRead = tool({
  description,
  inputSchema: toolInputSchema.shape["todo-read"],
  outputSchema: toolOutputSchema.shape["todo-read"],
  async *execute(_, { experimental_context: context }) {
    const { threadId, memory } = context as RuntimeContext;

    const todos = await memory.findOne<DBTodo>({
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
