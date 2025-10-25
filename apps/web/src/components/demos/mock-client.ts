/* agent-frontmatter:start
AGENT: Mock AgentStart client  
PURPOSE: Provide mock oRPC client for component demos
USAGE: import { mockClient, mockNavigate } from './mock-client'
EXPORTS: mockClient, mockNavigate
FEATURES:
  - Mock oRPC router client matching AgentStartAPI structure
  - Procedures that are callable functions with proper structure
  - Console logging for debugging
SEARCHABLE: mock client, demo utilities, orpc mock
agent-frontmatter:end */

import type { AgentStartAPI } from "agentstart/api";

// Mock data matching DBThread schema
const mockThreads = [
  {
    id: "thread-1",
    userId: "demo-user",
    title: "Example conversation 1",
    visibility: "private" as const,
    lastContext: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "thread-2",
    userId: "demo-user",
    title: "Example conversation 2",
    visibility: "private" as const,
    lastContext: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];

// Mock data matching AgentStartUIMessage type
const mockMessages = [
  {
    id: "msg-1",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Help me create a React component",
      },
    ],
    createdAt: new Date(),
  },
  {
    id: "msg-2",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Sure! I can help you create a React component. What kind of component would you like?",
      },
    ],
    createdAt: new Date(),
  },
];

// Helper to create a callable mock procedure
function createMockProcedure<TInput, TOutput>(
  name: string,
  handler: (input: TInput) => Promise<TOutput> | TOutput,
) {
  const procedure = async (input: TInput) => {
    console.log(`📋 [Mock Client] ${name} called with:`, input);
    const result = await handler(input);
    console.log(`✅ [Mock Client] ${name} returned:`, result);
    return result;
  };
  return procedure;
}

// Create a mock oRPC client that matches RouterClient structure
export const mockClient = {
  thread: {
    list: createMockProcedure(
      "thread.list",
      async (input?: { page?: number; pageSize?: number }) => {
        return {
          threads: mockThreads,
          pageInfo: {
            page: input?.page ?? 1,
            pageSize: input?.pageSize ?? 20,
            total: mockThreads.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      },
    ),
    loadMessages: createMockProcedure(
      "thread.loadMessages",
      async (_input: { threadId: string }) => {
        return mockMessages;
      },
    ),
    create: createMockProcedure(
      "thread.create",
      async (input?: { title?: string; visibility?: "public" | "private" }) => {
        const now = new Date();
        const newThread = {
          id: `thread-${Date.now()}`,
          userId: "demo-user",
          title: input?.title ?? "New Thread",
          visibility: (input?.visibility ?? "private") as "public" | "private",
          lastContext: null,
          createdAt: now,
          updatedAt: now,
        };
        return {
          threadId: newThread.id,
          thread: newThread,
        };
      },
    ),
    update: createMockProcedure(
      "thread.update",
      async (input: {
        threadId: string;
        data: {
          title?: string;
          visibility?: "public" | "private";
          lastContext?: unknown;
        };
      }) => {
        const thread = mockThreads.find((t) => t.id === input.threadId);
        const now = new Date();

        const updates: {
          title?: string;
          visibility?: "public" | "private";
          lastContext?: unknown;
        } = {};

        if ("title" in input.data && typeof input.data.title !== "undefined") {
          updates.title = input.data.title;
        }
        if (
          "visibility" in input.data &&
          typeof input.data.visibility !== "undefined"
        ) {
          updates.visibility = input.data.visibility;
        }
        if (
          "lastContext" in input.data &&
          typeof input.data.lastContext !== "undefined"
        ) {
          updates.lastContext = input.data.lastContext;
        }

        if (thread) {
          return {
            thread: {
              ...thread,
              ...updates,
              updatedAt: now,
            },
          };
        }

        return {
          thread: {
            id: input.threadId,
            userId: "demo-user",
            title:
              typeof updates.title === "string"
                ? updates.title
                : "Untitled Thread",
            visibility: updates.visibility ?? "private",
            lastContext: updates.lastContext ?? null,
            createdAt: now,
            updatedAt: now,
          },
        };
      },
    ),
    delete: createMockProcedure(
      "thread.delete",
      async (_input: { threadId: string }) => {
        return { success: true };
      },
    ),
    stream: createMockProcedure("thread.stream", async () => {
      return (async function* () {
        yield { type: "text-delta", textDelta: "Hello" };
      })();
    }),
  },
  message: {
    get: createMockProcedure(
      "message.get",
      async (_input: { threadId: string }) => {
        return mockMessages;
      },
    ),
  },
} as unknown as AgentStartAPI;

export const mockNavigate = (path: string) => {
  console.log(`🧭 [Mock Client] Navigate to: ${path}`);
};
