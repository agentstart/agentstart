/* agent-frontmatter:start
AGENT: Thread router using oRPC
PURPOSE: Stream agent responses through the shared Agent instance
USAGE: thread.stream({ threadId, message })
EXPORTS: threadRouter, createThreadRouter
FEATURES:
  - Delegates streaming to the configured Agent
  - Forwards client-provided thread identifiers to persistence
  - Returns AI SDK UI message event streams
  - Supports dynamic middleware via procedure builder
SEARCHABLE: thread router, agent stream, rpc thread
agent-frontmatter:end */

import { AgentStartError } from "@agentstart/utils";
import { streamToEventIterator, type } from "@orpc/server";
import z from "zod";
import { type AgentStartUIMessage, getThreads, loadThread } from "@/agent";
import { publicProcedure } from "@/api/procedures";
import { type DBThread, getAdapter } from "@/db";
import { getSandbox } from "@/sandbox";

/**
 * Create thread router with optional custom procedure builder
 */
export function createThreadRouter(procedure = publicProcedure) {
  return {
    list: procedure
      .input(
        z
          .object({
            page: z.number().int().min(1).optional(),
            pageSize: z.number().int().min(1).max(20).optional(),
          })
          .optional(),
      )
      .handler(async ({ input, context, errors }) => {
        try {
          const db = await getAdapter(context);
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : undefined;

          const page = input?.page ?? 1;
          const pageSize = input?.pageSize ?? 20;
          const offset = (page - 1) * pageSize;

          const [threads, total] = await Promise.all([
            getThreads({
              db,
              userId,
              limit: pageSize,
              offset,
            }),
            db.count({
              model: "thread",
              where: userId ? [{ field: "userId", value: userId }] : undefined,
            }),
          ]);

          const totalPages = Math.ceil(total / pageSize);
          const hasNextPage = offset + threads.length < total;

          return {
            threads,
            pageInfo: {
              page,
              pageSize,
              total,
              totalPages,
              hasNextPage,
              hasPreviousPage: page > 1,
            },
          };
        } catch (error) {
          console.error("Failed to list threads:", error);
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

    create: procedure
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
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

    loadMessages: procedure
      .input(z.object({ threadId: z.string() }))
      .handler(async ({ input, context, errors }) => {
        try {
          const db = await getAdapter(context);

          const messages = await loadThread({
            db,
            threadId: input.threadId,
          });
          return messages;
        } catch (error) {
          console.error("Failed to load messages:", error);
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

    stream: procedure
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
            generateTitle: context.advanced?.generateTitle,
            generateSuggestions: context.advanced?.generateSuggestions,
          });

          return streamToEventIterator(result);
        } catch (error) {
          console.error("Failed to stream thread response:", error);
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

    rename: procedure
      .input(
        z.object({
          threadId: z.string(),
          title: z.string().min(1),
        }),
      )
      .handler(async ({ input, context, errors }) => {
        try {
          const adapter = await getAdapter(context);
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : "anonymous";

          // Verify thread ownership
          const thread = await adapter.findOne<DBThread>({
            model: "thread",
            where: [{ field: "id", value: input.threadId }],
          });

          if (!thread) {
            throw errors.NOT_FOUND({
              message: "Thread not found",
            });
          }

          if (thread.userId !== userId) {
            throw errors.FORBIDDEN({
              message: "You don't have permission to rename this thread",
            });
          }

          const updatedThread = await adapter.update({
            model: "thread",
            where: [{ field: "id", value: input.threadId }],
            update: {
              title: input.title,
              updatedAt: new Date(),
            },
          });

          return { thread: updatedThread };
        } catch (error) {
          console.error("Failed to rename thread:", error);
          if (error instanceof Error && "code" in error) {
            throw error;
          }
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

    delete: procedure
      .input(z.object({ threadId: z.string() }))
      .handler(async ({ input, context, errors }) => {
        try {
          const adapter = await getAdapter(context);
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : "anonymous";

          // Verify thread ownership
          const thread = await adapter.findOne<DBThread>({
            model: "thread",
            where: [{ field: "id", value: input.threadId }],
          });

          if (!thread) {
            throw errors.NOT_FOUND({
              message: "Thread not found",
            });
          }

          if (thread.userId !== userId) {
            throw errors.FORBIDDEN({
              message: "You don't have permission to delete this thread",
            });
          }

          await Promise.all([
            // Delete associated messages first
            adapter.deleteMany({
              model: "message",
              where: [{ field: "threadId", value: input.threadId }],
            }),
            // Delete the thread
            await adapter.delete({
              model: "thread",
              where: [{ field: "id", value: input.threadId }],
            }),
          ]);

          return { success: true };
        } catch (error) {
          console.error("Failed to delete thread:", error);
          if (error instanceof Error && "code" in error) {
            throw error;
          }
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),
  };
}
