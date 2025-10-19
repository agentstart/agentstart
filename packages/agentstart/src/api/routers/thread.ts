/* agent-frontmatter:start
AGENT: Thread router using oRPC
PURPOSE: Stream agent responses through the shared Agent instance
USAGE: thread.stream({ threadId, message })
EXPORTS: threadRouter
FEATURES:
  - Delegates streaming to the configured Agent
  - Forwards client-provided thread identifiers to persistence
  - Returns AI SDK UI message event streams
SEARCHABLE: thread router, agent stream, rpc thread
agent-frontmatter:end */

import { AgentStartError } from "@agentstart/utils";
import { streamToEventIterator, type } from "@orpc/server";
import z from "zod";
import { type AgentStartUIMessage, getThreads, loadThread } from "@/agent";
import { publicProcedure } from "@/api/procedures";
import { getAdapter } from "@/db";
import { getSandbox } from "@/sandbox";

export const threadRouter = {
  list: publicProcedure.handler(async ({ context }) => {
    const db = await getAdapter(context);
    const userId = context.getUserId
      ? await context.getUserId(context.headers)
      : undefined;

    const threads = await getThreads({
      db,
      userId,
    });

    // First thread is the most recent (already sorted by updatedAt desc)
    const activeThread = threads[0] || null;

    return {
      threads,
      activeThreadId: activeThread?.id || null,
    };
  }),

  create: publicProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          visibility: z.enum(["public", "private"]).optional(),
        })
        .optional(),
    )
    .handler(async ({ input, context, errors }) => {
      try {
        const adapter = await getAdapter(context);
        const now = new Date();
        const userId = context.getUserId
          ? await context.getUserId(context.headers)
          : "anonymous";

        const thread = await adapter.create({
          model: "thread",
          data: {
            userId,
            title: input?.title ?? "New Thread",
            visibility: input?.visibility ?? "private",
            createdAt: now,
            updatedAt: now,
          },
        });

        return { threadId: thread.id.toString(), thread };
      } catch (error) {
        console.error("Failed to create thread:", error);
        throw errors.UNKNOWN({
          message: "Failed to create thread",
        });
      }
    }),

  loadMessages: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .handler(async ({ input, context }) => {
      const db = await getAdapter(context);

      const messages = await loadThread({
        db,
        threadId: input.threadId,
      });
      return messages;
    }),

  stream: publicProcedure
    .input(
      type<{
        threadId: string;
        message: AgentStartUIMessage;
        model?: string;
      }>(),
    )
    .handler(async ({ input, context, errors }) => {
      try {
        const agent = context.agent;
        if (!agent) {
          throw new AgentStartError(
            "AGENT_NOT_CONFIGURED",
            "No agent configured",
          );
        }

        const adapter = await getAdapter(context);
        const sandbox = await getSandbox(context);

        const result = await agent.stream({
          adapter,
          sandbox,
          message: input.message,
          threadId: input.threadId,
        });

        return streamToEventIterator(result);
      } catch (error) {
        console.error("Failed to stream thread response:", error);
        throw errors.UNKNOWN({
          message: "Failed to stream thread response",
        });
      }
    }),
};
