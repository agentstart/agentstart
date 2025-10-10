/* agent-frontmatter:start
AGENT: Messages router using oRPC
PURPOSE: Expose read-only chat history endpoints
USAGE: messages.get({ chatId })
EXPORTS: messagesRouter
FEATURES:
  - Loads persisted AgentStack UI messages via loadChat
  - Works with any configured memory adapter on the context
  - Returns normalized message arrays for clients
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
    .handler(async ({ input, context, errors }) => {
      try {
        const messages = await loadChat<AgentStackUIMessage>({
          memory: context.memory,
          chatId: input.chatId,
        });
        return messages;
      } catch (error) {
        console.error("Error loading chat messages:", error);
        throw errors.UNKNOWN({
          message: "Failed to load chat messages",
        });
      }
    }),
};
