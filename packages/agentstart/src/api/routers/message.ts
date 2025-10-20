/* agent-frontmatter:start
AGENT: Messages router using oRPC
PURPOSE: Expose read-only thread history endpoints
USAGE: messages.get({ threadId })
EXPORTS: messagesRouter
FEATURES:
  - Loads persisted AgentStart UI messages via loadThread
  - Works with any configured memory adapter on the context
  - Returns normalized message arrays for clients
SEARCHABLE: messages router, thread history, loadThread api
agent-frontmatter:end */

import { z } from "zod/v4";
import { type AgentStartUIMessage, loadThread } from "@/agent";
import { publicProcedure } from "@/api/procedures";
import { getAdapter } from "@/db";

export const messageRouter = {
  get: publicProcedure
    .input(
      z.object({
        threadId: z.string().min(1, "Thread ID is required"),
      }),
    )
    .handler(async ({ input, context, errors }) => {
      try {
        const db = await getAdapter(context);
        const messages = await loadThread<AgentStartUIMessage>({
          db,
          threadId: input.threadId,
        });
        return messages;
      } catch (error) {
        console.error("Error loading thread messages:", error);
        throw errors.INTERNAL_SERVER_ERROR({
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
};
