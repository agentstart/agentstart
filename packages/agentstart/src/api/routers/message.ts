/* agent-frontmatter:start
AGENT: Messages router using oRPC
PURPOSE: Expose read-only thread history endpoints
USAGE: messages.get({ threadId })
EXPORTS: messagesRouter, createMessageRouter
FEATURES:
  - Loads persisted AgentStart UI messages via loadThread
  - Works with any configured memory adapter on the context
  - Returns normalized message arrays for clients
  - Supports dynamic middleware via procedure builder
SEARCHABLE: messages router, thread history, loadThread api
agent-frontmatter:end */

import { z } from "zod";
import { type AgentStartUIMessage, loadThread } from "@/agent";
import { metadataSchema } from "@/agent/messages/metadata";
import { publicProcedure } from "@/api/procedures";
import { handleRouterError } from "@/api/utils/error-handler";
import { getAdapter, messageSchema } from "@/memory";

/**
 * Create message router with optional custom procedure builder
 */
export function createMessageRouter(procedure = publicProcedure) {
  const uiMessageSchema = messageSchema
    .omit({
      threadId: true,
      attachments: true,
      createdAt: true,
      updatedAt: true,
    })
    .extend({
      metadata: metadataSchema.optional(),
      parts: z.array(z.any()),
    })
    .transform((value): AgentStartUIMessage => {
      const parts = value.parts as AgentStartUIMessage["parts"];
      const message: AgentStartUIMessage = {
        id: value.id,
        role: value.role,
        parts,
      };
      if (value.metadata) {
        message.metadata = value.metadata;
      }
      return message;
    });

  return {
    get: procedure
      .meta({
        doc: {
          summary: "Get all persisted messages for a thread",
          description:
            "Fetches the normalized AgentStart UI message sequence so clients can hydrate conversational views.",
          examples: [
            {
              title: "Load UI messages",
              code: "await start.api.message.get({ threadId: 'thr_123' });",
            },
          ],
        },
      })
      .input(
        z.object({
          threadId: z.string().min(1, "Thread ID is required"),
        }),
      )
      .output(z.array(uiMessageSchema))
      .handler(async ({ input, context, errors }) => {
        try {
          const memory = await getAdapter(context);
          const messages = await loadThread<AgentStartUIMessage>({
            memory,
            threadId: input.threadId,
          });
          return messages;
        } catch (error) {
          console.error("Error loading thread messages:", error);
          handleRouterError(error, errors);
        }
      }),
  };
}
