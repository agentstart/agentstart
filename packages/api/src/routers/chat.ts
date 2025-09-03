// AGENT: Chat router using oRPC
// PURPOSE: AI chat completion endpoints with streaming support
// USAGE: Handles chat messages with OpenRouter integration
// FEATURES:
//   - Streaming AI responses
//   - Multiple model support via OpenRouter
//   - Web search capability with Perplexity
// SEARCHABLE: chat router, ai api, openrouter, streaming chat

import type { UIMessage } from "ai";
import { convertToModelMessages, streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { protectedProcedure } from "../procedures";
import { streamToEventIterator, type } from "@orpc/server";
import { env } from "../../env";

export const chatRouter = {
  stream: protectedProcedure
    .input(
      type<{
        chatId: string;
        messages: UIMessage[];
        webSearch?: boolean;
        model: string;
      }>(),
    )
    .handler(async ({ input }) => {
      const apiKey = env.OPENROUTER_API_KEY;

      // Create OpenRouter client
      const openrouter = createOpenRouter({
        apiKey,
      });

      // Select model based on web search preference
      const model = input.webSearch
        ? openrouter("perplexity/sonar")
        : openrouter(input.model);

      // Stream the text response
      const result = streamText({
        model,
        messages: convertToModelMessages(input.messages),
        system: `You are a helpful AI assistant. You provide clear, concise, and accurate responses. 
                 When providing code examples, use appropriate syntax highlighting.
                 Be friendly and professional in your communication.`,
      });

      // Return the streaming response
      // Note: In actual implementation, you might need to handle streaming differently
      // depending on your client setup
      return streamToEventIterator(result.toUIMessageStream());
    }),
};
