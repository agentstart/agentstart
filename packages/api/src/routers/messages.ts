/* agent-frontmatter:start
AGENT: Messages router using oRPC
PURPOSE: Provide read APIs for chat message history
USAGE: Fetch persisted chat messages by chat identifier
FEATURES:
  - Uses loadChat helper to read from configured memory adapter
  - Requires authenticated access
SEARCHABLE: messages router, chat history, loadChat api
agent-frontmatter:end */

import { type AgentStackUIMessage, loadChat } from "@agent-stack/core";
import { z } from "zod/v4";
import { publicProcedure } from "../procedures";

export const messagesRouter = {
  get: publicProcedure
    .input(
      z.object({
        chatId: z.string().min(1, "Chat ID is required"),
      }),
    )
    .handler(async ({ input, context }) => {
      const messages = await loadChat<AgentStackUIMessage>({
        memory: context.memory,
        chatId: input.chatId,
      });

      return messages;
    }),
};
