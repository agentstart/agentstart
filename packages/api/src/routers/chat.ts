/* agent-frontmatter:start
AGENT: Chat router using oRPC
PURPOSE: Stream agent responses through the shared Agent instance
USAGE: chat.stream({ chatId, projectId, message })
EXPORTS: chatRouter
FEATURES:
  - Delegates streaming to the configured Agent
  - Forwards client-provided chat identifiers to persistence
  - Returns AI SDK UI message event streams
SEARCHABLE: chat router, agent stream, rpc chat
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/utils";
import { streamToEventIterator, type } from "@orpc/server";
import {
  type AgentStackUIMessage,
  getChatsByProjectId,
  loadChat,
} from "agent-stack";
import { getAdapter } from "agent-stack/db";
import z from "zod";
import { publicProcedure } from "../procedures";

export const chatRouter = {
  getChats: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .handler(async ({ input, context }) => {
      const adapter = await getAdapter(context);

      const chats = await getChatsByProjectId({
        adapter,
        projectId: input.projectId,
      });

      // First chat is the most recent (already sorted by updatedAt desc)
      const activeChat = chats[0] || null;

      return {
        chats,
        activeChatId: activeChat?.id || null,
      };
    }),

  loadMessages: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .handler(async ({ input, context }) => {
      const adapter = await getAdapter(context);

      const messages = await loadChat({ adapter, chatId: input.chatId });
      return messages;
    }),

  stream: publicProcedure
    .input(
      type<{
        chatId: string;
        projectId: string;
        message: AgentStackUIMessage;
        model?: string;
      }>(),
    )
    .handler(async ({ input, context, errors }) => {
      try {
        const agent = context.agent;
        if (!agent) {
          throw new AgentStackError(
            "AGENT_NOT_CONFIGURED",
            "No agent configured",
          );
        }

        const adapter = await getAdapter(context);

        const result = await agent.stream({
          adapter,
          message: input.message,
          chatId: input.chatId,
          projectId: input.projectId,
        });

        return streamToEventIterator(result);
      } catch (error) {
        console.error("Failed to stream chat response:", error);
        throw errors.UNKNOWN({
          message: "Failed to stream chat response",
        });
      }
    }),
};
