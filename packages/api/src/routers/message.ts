/* agent-frontmatter:start
AGENT: Messages router using oRPC
PURPOSE: Expose read-only thread history endpoints
USAGE: messages.get({ threadId })
EXPORTS: messagesRouter
FEATURES:
  - Loads persisted AgentStack UI messages via loadThread
  - Works with any configured memory adapter on the context
  - Returns normalized message arrays for clients
SEARCHABLE: messages router, thread history, loadThread api
agent-frontmatter:end */

import { type AgentStackUIMessage, loadThread } from "@agent-stack/agent";
import { getAdapter } from "@agent-stack/infra/db";
import { z } from "zod/v4";
import { publicProcedure } from "../procedures";

export const messageRouter = {
  get: publicProcedure
    .input(
      z.object({
        threadId: z.string().min(1, "Thread ID is required"),
      }),
    )
    .handler(async ({ input, context, errors }) => {
      try {
        const adapter = await getAdapter(context);
        const messages = await loadThread<AgentStackUIMessage>({
          adapter,
          threadId: input.threadId,
        });
        return messages;
      } catch (error) {
        console.error("Error loading thread messages:", error);
        throw errors.UNKNOWN({
          message: "Failed to load thread messages",
        });
      }
    }),
};
