/* agent-frontmatter:start
AGENT: Agent conversation viewer
PURPOSE: Render thread messages with auto-scroll and tool-aware formatting
USAGE: <Conversation threadId={threadId} />
EXPORTS: Conversation, ConversationProps
FEATURES:
  - Loads thread transcripts with TanStack Query and the AgentStart client
  - Displays AI responses and tool interactions with timeline styling
  - Keeps the conversation pinned to the latest message with scroll controls
SEARCHABLE: conversation viewer, thread messages, agentstart conversation, auto scroll
agent-frontmatter:end */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { AgentStartUIMessage } from "agentstart/agent";
import { type AgentStore, useAgentStore } from "agentstart/client";
import { ChevronDownIcon, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import {
  Conversation as BaseConversation,
  type ConversationProps as BaseConversationProps,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAgentStartContext } from "./provider";
import { MessagePart } from "./tools/message-part-view";

export interface ConversationProps
  extends Omit<BaseConversationProps, "children"> {
  /**
   * Thread identifier to hydrate the conversation.
   */
  threadId?: string;
  /**
   * Optional store identifier when using multiple concurrent conversations.
   */
  storeId?: string;
  /**
   * Custom empty state element when no messages are present.
   */
  emptyState?: ReactNode;
  /**
   * Custom loading state element while fetching the thread history.
   */
  loadingState?: ReactNode;
  /**
   * Provide a custom error renderer when fetching messages fails.
   */
  errorState?: (error: Error, retry: () => void) => ReactNode;
}

export function Conversation({
  threadId,
  storeId = "default",
  className,
  emptyState,
  loadingState,
  errorState,
  ...props
}: ConversationProps) {
  const { orpc } = useAgentStartContext();

  const messages = useAgentStore<AgentStartUIMessage, AgentStartUIMessage[]>(
    (state) => state.messages,
    storeId,
  );
  const status = useAgentStore<
    AgentStartUIMessage,
    AgentStore<AgentStartUIMessage>["status"]
  >((state) => state.status, storeId);
  const storeError = useAgentStore<
    AgentStartUIMessage,
    AgentStore<AgentStartUIMessage>["error"]
  >((state) => state.error, storeId);
  const setMessages = useAgentStore<
    AgentStartUIMessage,
    AgentStore<AgentStartUIMessage>["setMessages"]
  >((state) => state.setMessages, storeId);

  const queryResult = useQuery({
    ...orpc.message.get.queryOptions({
      input: { threadId: threadId ?? "" },
    }),
    enabled: Boolean(threadId),
  });

  const {
    data: fetchedMessages,
    error: queryError,
    isError,
    isLoading,
    isFetching,
    refetch,
  } = queryResult;

  useEffect(() => {
    if (!threadId) {
      if (messages.length > 0) {
        setMessages([]);
      }
      return;
    }

    if (!fetchedMessages) {
      return;
    }

    if (fetchedMessages.length === 0) {
      return;
    }

    const shouldUpdate =
      messages.length === 0 ||
      fetchedMessages.length > messages.length ||
      !messages.every(
        (message, index) => message.id === fetchedMessages[index]?.id,
      );

    if (shouldUpdate) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages, messages, setMessages, threadId]);

  const renderAssistantMessage = useCallback(
    (message: AgentStartUIMessage, isLastMessage: boolean) => {
      const parts = message.parts ?? [];
      const textParts = parts.filter((part) => part.type === "text");
      const toolParts = parts.filter((part) => part.type !== "text");
      const showSpinner =
        isLastMessage && (status === "streaming" || status === "submitted");
      const statusLabel = isLastMessage
        ? status === "streaming"
          ? "Working..."
          : status === "submitted"
            ? "Thinking..."
            : status === "error"
              ? "Error occurred"
              : "Finished working"
        : "Finished working";

      return (
        <>
          {toolParts.length > 0 && (
            <Task
              className="w-full"
              defaultOpen={
                isLastMessage &&
                (status === "streaming" ||
                  status === "submitted" ||
                  status === "error")
              }
            >
              <TaskTrigger className="w-full" title={statusLabel}>
                <div className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
                  {showSpinner ? <Spinner className="size-4" /> : null}
                  <span>{statusLabel}</span>
                  <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </TaskTrigger>
              <TaskContent>
                {toolParts.map((part, index) => (
                  <TaskItem key={`${message.id}-tool-${index}`}>
                    <MessagePart
                      part={part}
                      isStreaming={
                        isLastMessage &&
                        status === "streaming" &&
                        index === toolParts.length - 1
                      }
                    />
                  </TaskItem>
                ))}
              </TaskContent>
            </Task>
          )}
          {textParts.map((part, index) => (
            <Response key={`${message.id}-text-${index}`}>
              {part.type === "text" ? part.text : null}
            </Response>
          ))}
        </>
      );
    },
    [status],
  );

  const renderUserMessage = useCallback((message: AgentStartUIMessage) => {
    const parts = message.parts ?? [];
    const textParts = parts.filter((part) => part.type === "text");

    if (textParts.length > 0) {
      return textParts.map((part, index) => (
        <Response key={`${message.id}-text-${index}`}>{part.text}</Response>
      ));
    }

    return null;
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const fetchError = isError ? (queryError as Error) : null;
  const hasMessages = messages.length > 0;
  const showInitialLoading =
    Boolean(threadId) &&
    !hasMessages &&
    (isLoading || (isFetching && !fetchedMessages));

  const defaultEmptyState = (
    <ConversationEmptyState
      icon={<MessageSquare className="size-12 text-muted-foreground" />}
      title="Start a conversation"
      description="Send a message to begin chatting with the agent."
    />
  );

  const defaultLoadingState = (
    <ConversationEmptyState
      icon={<Spinner className="text-muted-foreground" />}
      title="Loading conversation"
      description="Fetching the latest messages…"
    />
  );

  const defaultErrorState = fetchError ? (
    <ConversationEmptyState
      icon={<MessageSquare className="size-12 text-destructive" />}
      title="Unable to load messages"
      description={fetchError.message ?? "Please try again."}
    >
      <Button onClick={handleRetry} type="button" variant="outline">
        Retry
      </Button>
    </ConversationEmptyState>
  ) : null;

  return (
    <BaseConversation
      className={cn("relative flex w-full flex-col", className)}
      {...props}
    >
      <ConversationContent className="mx-auto flex flex-1 flex-col gap-4 p-0 sm:min-w-[390px] sm:max-w-[768px]">
        {fetchError ? (
          (errorState?.(fetchError, handleRetry) ?? defaultErrorState)
        ) : showInitialLoading ? (
          (loadingState ?? defaultLoadingState)
        ) : messages.length > 0 ? (
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => {
              if (message.role === "system") {
                return null;
              }

              const isLastMessage = index === messages.length - 1;
              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent
                    className={cn("", {
                      "space-y-3": message.role === "assistant",
                      "!bg-background !text-foreground relative flex items-center overflow-hidden rounded-[12px] border p-3 text-base ltr:rounded-br-none rtl:rounded-bl-none dark:border-0":
                        message.role === "user",
                    })}
                    variant={
                      message.role === "assistant" ? "flat" : "contained"
                    }
                  >
                    {message.role === "assistant"
                      ? renderAssistantMessage(message, isLastMessage)
                      : renderUserMessage(message)}
                  </MessageContent>
                </Message>
              );
            })}
            {status === "streaming" && (
              <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground text-sm">
                <Spinner />
                <span>Assistant is responding…</span>
              </div>
            )}
            {storeError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive text-sm">
                {storeError.message ?? "Unexpected error"}
              </div>
            )}
          </div>
        ) : (
          (emptyState ?? defaultEmptyState)
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </BaseConversation>
  );
}
