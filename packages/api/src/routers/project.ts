import { type DBProject, getAdapter } from "agent-stack/db";
import { publicProcedure } from "../procedures";

export const projectRouter = {
  list: publicProcedure.handler(async ({ context, errors }) => {
    try {
      const userId = await context.getUserId(context.headers);
      const adapter = await getAdapter(context);

      const records = await adapter.findMany<DBProject>({
        model: "project",
        where: [{ field: "authorId", operator: "eq", value: userId }],
        sortBy: { field: "updatedAt", direction: "desc" },
      });

      return records;
    } catch (error) {
      if (error instanceof Error) {
        throw errors.INTERNAL_SERVER_ERROR({
          message: `Failed to fetch projects: ${error.message}`,
        });
      }

      throw errors.INTERNAL_SERVER_ERROR({
        message: "Failed to fetch projects",
      });
    }
  }),
  create: publicProcedure.handler(async ({ context, errors }) => {
    try {
      const userId = await context.getUserId(context.headers);
      let projectId: string | null = null;
      let chatId: string | null = null;

      const adapter = await getAdapter(context);

      const now = new Date();

      const insertedProject = await adapter.create({
        model: "project",
        data: {
          authorId: userId,
          title: "New Project",
          visibility: "public" as const,
          createdAt: now,
          updatedAt: now,
        },
      });
      projectId = insertedProject.id.toString();

      // Create initial chat for the project
      const insertedChat = await adapter.create({
        model: "chat",
        data: {
          projectId,
          title: "New Chat",
          userId,
          createdAt: now,
          updatedAt: now,
        },
      });
      chatId = insertedChat.id.toString();

      return {
        projectId,
        chatId,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw errors.INTERNAL_SERVER_ERROR({
          message: `Failed to create project: ${error.message}`,
        });
      }

      throw errors.INTERNAL_SERVER_ERROR({
        message: "Failed to create project",
      });
    }
  }),
};
