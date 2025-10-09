/* agent-frontmatter:start
AGENT: Chat router using oRPC
PURPOSE: AI chat completion endpoints with streaming support
USAGE: Handles chat messages with OpenRouter integration
FEATURES:
  - Streaming AI responses
  - Multiple model support via OpenRouter
  - Web search capability with Perplexity
SEARCHABLE: chat router, ai api, openrouter, streaming chat
agent-frontmatter:end */

import type { AgentStackUIMessage } from "@agent-stack/core";
import { streamToEventIterator, type } from "@orpc/server";
import { publicProcedure } from "../procedures";

export const chatRouter = {
  stream: publicProcedure
    .input(
      type<{
        chatId: string;
        projectId: string;
        message: AgentStackUIMessage;
        model?: string;
      }>(),
    )
    .handler(async ({ input, context }) => {
      const result = await context.instance.stream({
        message: input.message,
        chatId: input.chatId,
        projectId: input.projectId,
      });

      return streamToEventIterator(result);
    }),
};
