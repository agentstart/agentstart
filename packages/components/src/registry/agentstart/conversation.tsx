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

import {
  ArrowsClockwiseIcon,
  ChatSlashIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { AgentStartUIMessage } from "agentstart/agent";
import { type AgentStore, useAgentStore, useDataPart } from "agentstart/client";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { Action, Actions } from "@/components/ai-elements/actions";
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
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAgentStartContext } from "./provider";
import { StatusIndicators } from "./status-indicators";
import { MessagePart } from "./tools/message-part-view";

export interface ConversationProps
  extends Omit<BaseConversationProps, "children"> {
  contentClassName?: string;
  /**
   * Thread identifier to hydrate the conversation.
   */
  threadId?: string;
  /**
   * Optional messages used to hydrate the UI before the client store syncs.
   */
  initialMessages?: AgentStartUIMessage[];
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

type UIAgentStore = AgentStore<AgentStartUIMessage>;

export function Conversation({
  threadId,
  className,
  contentClassName,
  emptyState,
  loadingState,
  errorState,
  initialMessages,
  ...props
}: ConversationProps) {
  const { orpc } = useAgentStartContext();

  const resolvedStoreId = threadId ?? "default";

  const messages = useAgentStore<AgentStartUIMessage, AgentStartUIMessage[]>(
    (state) => state.messages,
    resolvedStoreId,
  );
  const status = useAgentStore<AgentStartUIMessage, UIAgentStore["status"]>(
    (state) => state.status,
    resolvedStoreId,
  );
  const storeError = useAgentStore<AgentStartUIMessage, UIAgentStore["error"]>(
    (state) => state.error,
    resolvedStoreId,
  );
  const setMessages = useAgentStore<
    AgentStartUIMessage,
    UIAgentStore["setMessages"]
  >((state) => state.setMessages, resolvedStoreId);
  const regenerate = useAgentStore<
    AgentStartUIMessage,
    UIAgentStore["regenerate"]
  >((state) => state.regenerate, resolvedStoreId);
  const newThreadDraft = useAgentStore<
    AgentStartUIMessage,
    UIAgentStore["newThreadDraft"]
  >((state) => state.newThreadDraft);
  const messageQueue = useAgentStore<
    AgentStartUIMessage,
    UIAgentStore["messageQueue"]
  >((state) => state.messageQueue);
  const hasQueue = messageQueue.length > 0;

  const [suggestions] = useDataPart(
    "data-agentstart-suggestions",
    resolvedStoreId,
  );
  const hasSuggestions = suggestions?.prompts && suggestions.prompts.length > 0;

  const hasNewThreadDraft = useMemo(() => {
    if (!newThreadDraft) return false;

    const hasText = (newThreadDraft.text?.trim() ?? "").length > 0;
    const files = newThreadDraft.files;
    const fileCount =
      files instanceof FileList
        ? files.length
        : Array.isArray(files)
          ? files.length
          : 0;

    return hasText || fileCount > 0;
  }, [newThreadDraft]);

  const queryResult = useQuery(
    orpc.message.get.queryOptions({
      input: { threadId: threadId! },
      enabled: Boolean(threadId) && !hasNewThreadDraft,
      initialData: threadId ? initialMessages : undefined,
    }),
  );

  const {
    data: fetchedMessages,
    error: queryError,
    isError,
    isLoading,
    isFetching,
    refetch,
  } = queryResult;

  useEffect(() => {
    // If no threadId is provided, clear messages
    if (!threadId) {
      if (messages.length > 0) {
        setMessages([]);
      }
      return;
    }

    // If no messages were fetched, do nothing
    if (!fetchedMessages?.length) {
      return;
    }

    // If there are already messages in the store, do nothing
    if (messages.length > 0) {
      return;
    }

    // Set the fetched messages into the store
    setMessages(fetchedMessages);
  }, [fetchedMessages, messages, setMessages, threadId]);

  const renderAssistantMessage = useCallback(
    (message: AgentStartUIMessage, isLastMessage: boolean) => {
      const parts = message.parts ?? [];

      return parts.map((part, index) => (
        <MessagePart
          key={`${message.id}-tool-${index}`}
          part={part}
          isStreaming={
            isLastMessage &&
            status === "streaming" &&
            index === parts.length - 1
          }
        />
      ));
    },
    [status],
  );

  const renderUserMessage = useCallback((message: AgentStartUIMessage) => {
    const parts = message.parts ?? [];
    const textParts = parts.filter((part) => part.type === "text");

    return textParts.map((part, index) => (
      <Response key={`${message.id}-text-${index}`}>{part.text}</Response>
    ));
  }, []);

  const handleCopy = useCallback((message: AgentStartUIMessage) => {
    const parts = message.parts ?? [];
    const text = parts.find((part) => part.type === "text")?.text ?? "";
    void navigator.clipboard.writeText(text);
  }, []);

  const renderUserActions = useCallback(
    (message: AgentStartUIMessage) => (
      <Actions className="opacity-0 group-hover:opacity-100">
        <Action onClick={() => handleCopy(message)} label="Copy" tooltip="Copy">
          <CopyIcon className="size-4" />
        </Action>
      </Actions>
    ),
    [handleCopy],
  );

  const renderAssistantActions = useCallback(
    (message: AgentStartUIMessage) => {
      const parts = message.parts ?? [];
      const sourceParts = parts.filter((part) => part.type === "source-url");

      return (
        <>
          <Actions className="mt-2 w-full justify-start opacity-0 group-hover:opacity-100">
            <Action onClick={() => regenerate()} label="Retry" tooltip="Retry">
              <ArrowsClockwiseIcon className="size-4" />
            </Action>
            <Action
              onClick={() => handleCopy(message)}
              label="Copy"
              tooltip="Copy"
            >
              <CopyIcon className="size-4" />
            </Action>
          </Actions>

          {sourceParts.length > 0 && (
            <div className="mt-2 w-full">
              <Sources>
                <SourcesTrigger count={sourceParts.length} />
                <SourcesContent>
                  {sourceParts.map((part, index) => {
                    const sourcePart = part as {
                      url: string;
                      title?: string;
                    };
                    return (
                      <Source
                        key={`${message.id}-source-${index}`}
                        href={sourcePart.url}
                        title={sourcePart.title || sourcePart.url}
                      />
                    );
                  })}
                </SourcesContent>
              </Sources>
            </div>
          )}
        </>
      );
    },
    [handleCopy, regenerate],
  );

  const fetchError = isError ? (queryError as Error) : null;
  const effectiveMessages = messages.length > 0 ? messages : [];
  const hasMessages = effectiveMessages.length > 0;
  const showInitialLoading =
    Boolean(threadId) &&
    !hasMessages &&
    (hasNewThreadDraft || isLoading || (isFetching && !fetchedMessages));

  const defaultEmptyState = (
    <ConversationEmptyState
      icon={<ChatSlashIcon className="size-12 text-muted-foreground" />}
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

  const defaultErrorState = fetchError && (
    <ConversationEmptyState
      icon={<ChatSlashIcon className="size-12 text-destructive" />}
      title="Unable to load messages"
      description={fetchError.message ?? "Please try again."}
    >
      <Button onClick={() => refetch()} type="button" variant="outline">
        Retry
      </Button>
    </ConversationEmptyState>
  );

  return (
    <BaseConversation
      className={cn("relative flex w-full flex-col", className)}
      {...props}
    >
      <ConversationContent
        className={cn(
          "mx-auto flex flex-1 flex-col gap-4 p-0 sm:min-w-[390px] sm:max-w-3xl",
          contentClassName,
        )}
      >
        {fetchError ? (
          (errorState?.(fetchError, refetch) ?? defaultErrorState)
        ) : hasMessages ? (
          <div className="flex flex-col gap-4">
            {effectiveMessages.map((message, index) => {
              if (message.role === "system") {
                return null;
              }

              const isLastMessage = index === effectiveMessages.length - 1;
              return (
                <Message
                  from={message.role}
                  key={message.id}
                  className={cn("flex-col", {
                    "items-start": message.role === "assistant",
                    "items-end": message.role === "user",
                  })}
                >
                  {message.role === "user" && renderUserActions(message)}

                  <MessageContent
                    className={cn({
                      "space-y-3": message.role === "assistant",
                      "relative flex items-center overflow-hidden rounded-[12px] border bg-background! p-3 text-base text-foreground! ltr:rounded-br-none rtl:rounded-bl-none dark:border-0":
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

                  {message.role === "assistant" &&
                  ["ready", "error"].includes(status)
                    ? renderAssistantActions(message)
                    : null}
                </Message>
              );
            })}
            {["streaming", "submitted"].includes(status) && (
              <StatusIndicators />
            )}
            {storeError && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle className="text-destructive">
                    Error Occurred
                  </EmptyTitle>
                  <EmptyDescription className="overflow-hidden sm:min-w-[390px] sm:max-w-3xl">
                    {storeError.message ?? "Unexpected error"}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm">
                    <ArrowsClockwiseIcon className="size-4" />
                    Retry
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </div>
        ) : showInitialLoading ? (
          (loadingState ?? defaultLoadingState)
        ) : (
          (emptyState ?? defaultEmptyState)
        )}
      </ConversationContent>
      <ConversationScrollButton
        className={cn("bottom-42", {
          "bottom-52": hasSuggestions || hasQueue,
          "bottom-62": hasSuggestions && hasQueue,
        })}
      />
    </BaseConversation>
  );
}
