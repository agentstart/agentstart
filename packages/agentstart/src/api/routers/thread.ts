/* agent-frontmatter:start
AGENT: Thread router using oRPC
PURPOSE: Stream agent responses through the shared Agent instance
USAGE: const threadRouter = createThreadRouter(customProcedure)
EXPORTS: createThreadRouter
FEATURES:
  - Delegates streaming to the configured Agent via Run class
  - Forwards client-provided thread identifiers to persistence
  - Returns AI SDK UI message event streams via oRPC
  - Supports dynamic middleware via procedure builder
  - Provides thread list endpoint with pagination
  - Provides thread load endpoint with message history
SEARCHABLE: thread router, agent stream, rpc thread, orpc router
agent-frontmatter:end */

import { AgentStartError } from "@agentstart/utils";
import { streamToEventIterator } from "@orpc/server";
import z from "zod";
import { getThreads, loadThread, Run } from "@/agent";
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

    get: procedure
      .input(z.object({ threadId: z.string() }))
      .handler(async ({ input, context, errors }) => {
        try {
          const db = await getAdapter(context);
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : undefined;

          const thread = await db.findOne<DBThread>({
            model: "thread",
            where: [{ field: "id", value: input.threadId }],
          });

          if (!thread) {
            throw errors.NOT_FOUND({
              message: "Thread not found",
            });
          }

          // Check visibility: private threads require ownership
          if (thread.visibility === "private" && thread.userId !== userId) {
            throw errors.FORBIDDEN({
              message: "You don't have permission to access this thread",
            });
          }

          return { thread };
        } catch (error) {
          console.error("Failed to get thread:", error);
          if (error instanceof Error && "code" in error) {
            throw error;
          }
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
          const db = await getAdapter(context);
          const now = new Date();
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : "anonymous";

          const thread = await db.create({
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

    update: procedure
      .input(
        z.object({
          threadId: z.string(),
          data: z
            .object({
              title: z.string().min(1).optional(),
              visibility: z.enum(["public", "private"]).optional(),
              lastContext: z.any().nullable().optional(),
            })
            .refine(
              (fields) =>
                typeof fields.title !== "undefined" ||
                typeof fields.visibility !== "undefined" ||
                typeof fields.lastContext !== "undefined",
              {
                message: "Provide at least one field to update.",
              },
            ),
        }),
      )
      .handler(async ({ input, context, errors }) => {
        try {
          const db = await getAdapter(context);
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : "anonymous";

          // Verify thread ownership
          const thread = await db.findOne<DBThread>({
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
              message: "You don't have permission to update this thread",
            });
          }

          const updatePayload: Record<string, unknown> = {};

          if (
            "title" in input.data &&
            typeof input.data.title !== "undefined"
          ) {
            updatePayload.title = input.data.title;
          }
          if (
            "visibility" in input.data &&
            typeof input.data.visibility !== "undefined"
          ) {
            updatePayload.visibility = input.data.visibility;
          }
          if (
            "lastContext" in input.data &&
            typeof input.data.lastContext !== "undefined"
          ) {
            updatePayload.lastContext = input.data.lastContext;
          }

          if (Object.keys(updatePayload).length === 0) {
            throw errors.INTERNAL_SERVER_ERROR({
              message: "No update fields provided.",
            });
          }

          updatePayload.updatedAt = new Date();

          const updatedThread = await db.update({
            model: "thread",
            where: [{ field: "id", value: input.threadId }],
            update: updatePayload,
          });

          return { thread: updatedThread };
        } catch (error) {
          console.error("Failed to update thread:", error);
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
          const db = await getAdapter(context);
          const userId = context.getUserId
            ? await context.getUserId(context.headers)
            : "anonymous";

          // Verify thread ownership
          const thread = await db.findOne<DBThread>({
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
            db.deleteMany({
              model: "message",
              where: [{ field: "threadId", value: input.threadId }],
            }),
            // Delete the thread
            await db.delete({
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

    stream: procedure
      .input(
        z.object({
          threadId: z.string().min(1, "Thread ID is required"),
          message: z.any(),
          model: z.string().optional(),
        }),
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

          const db = await getAdapter(context);
          const sandbox = await getSandbox(context);

          const run = new Run(context);

          const result = await run.start({
            input: {
              message: input.message,
            },
            runtimeContext: {
              db,
              sandbox,
              threadId: input.threadId,
            },
            onError: (error) => {
              console.error("Agent stream error:", error);
              return "An error occurred while processing your request.";
            },
          });

          return streamToEventIterator(result);
        } catch (error) {
          console.error("Failed to stream thread response:", error);
          throw errors.INTERNAL_SERVER_ERROR({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),
  };
}
