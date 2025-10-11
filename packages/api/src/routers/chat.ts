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

import { type AgentStackUIMessage, getAdapter } from "@agent-stack/core";
import { AgentStackError } from "@agent-stack/errors";
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
    .handler(async ({ input, context, errors }) => {
      try {
        const agent = context.agents.at(0);
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
