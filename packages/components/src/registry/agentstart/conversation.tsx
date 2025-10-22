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

import { ArrowsClockwiseIcon, CopyIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { AgentStartUIMessage } from "agentstart/agent";
import { type AgentStore, useAgentStore } from "agentstart/client";
import { MessageSquare } from "lucide-react";
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
import { Shimmer } from "@/components/ai-elements/shimmer";
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
import { MessagePart } from "./tools/message-part-view";

export interface ConversationProps
  extends Omit<BaseConversationProps, "children"> {
  /**
   * Thread identifier to hydrate the conversation.
   */
  threadId?: string;
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
  className,
  emptyState,
  loadingState,
  errorState,
  ...props
}: ConversationProps) {
  const { orpc } = useAgentStartContext();

  type UIAgentStore = AgentStore<AgentStartUIMessage>;
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
  const pendingNewThreadInput = useAgentStore<
    AgentStartUIMessage,
    UIAgentStore["pendingNewThreadInput"]
  >((state) => state.pendingNewThreadInput);

  const hasPendingNewThreadInput = useMemo(() => {
    if (!pendingNewThreadInput) return false;

    const hasText = (pendingNewThreadInput.text?.trim() ?? "").length > 0;
    const files = pendingNewThreadInput.files;
    const fileCount =
      files instanceof FileList
        ? files.length
        : Array.isArray(files)
          ? files.length
          : 0;

    return hasText || fileCount > 0;
  }, [pendingNewThreadInput]);

  const queryResult = useQuery({
    ...orpc.message.get.queryOptions({
      input: { threadId: threadId ?? "" },
    }),
    enabled: Boolean(threadId) && !hasPendingNewThreadInput,
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

    if (!fetchedMessages?.length) {
      return;
    }

    const messagesChanged =
      messages.length !== fetchedMessages.length ||
      messages.some(
        (message, index) => message.id !== fetchedMessages[index]?.id,
      );

    if (messagesChanged) {
      setMessages(fetchedMessages);
    }
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
    (message: AgentStartUIMessage) => (
      <Actions className="mt-2 w-full justify-start opacity-0 group-hover:opacity-100">
        <Action onClick={() => regenerate()} label="Retry" tooltip="Retry">
          <ArrowsClockwiseIcon className="size-4" />
        </Action>
        <Action onClick={() => handleCopy(message)} label="Copy" tooltip="Copy">
          <CopyIcon className="size-4" />
        </Action>
      </Actions>
    ),
    [handleCopy, regenerate],
  );

  const fetchError = isError ? (queryError as Error) : null;
  const hasMessages = messages.length > 0;
  const showInitialLoading =
    Boolean(threadId) &&
    !hasMessages &&
    (hasPendingNewThreadInput || isLoading || (isFetching && !fetchedMessages));

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

  const defaultErrorState = fetchError && (
    <ConversationEmptyState
      icon={<MessageSquare className="size-12 text-destructive" />}
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
      <ConversationContent className="mx-auto flex flex-1 flex-col gap-4 p-0 sm:min-w-[390px] sm:max-w-[768px]">
        {fetchError ? (
          (errorState?.(fetchError, refetch) ?? defaultErrorState)
        ) : hasMessages ? (
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => {
              if (message.role === "system") {
                return null;
              }

              const isLastMessage = index === messages.length - 1;
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
                    renderAssistantActions(message)}
                </Message>
              );
            })}
            {["streaming", "submitted"].includes(status) && (
              <Message from="assistant">
                <MessageContent variant="flat">
                  <Loader />
                </MessageContent>
              </Message>
            )}
            {storeError && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle className="text-destructive">
                    Error Occurred
                  </EmptyTitle>
                  <EmptyDescription className="overflow-hidden sm:min-w-[390px] sm:max-w-[768px]">
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
      <ConversationScrollButton />
    </BaseConversation>
  );
}

const words = [
  "Accomplishing",
  "Actioning",
  "Actualizing",
  "Baking",
  "Booping",
  "Brewing",
  "Calculating",
  "Cerebrating",
  "Channelling",
  "Churning",
  "Clauding",
  "Coalescing",
  "Cogitating",
  "Computing",
  "Combobulating",
  "Concocting",
  "Considering",
  "Contemplating",
  "Cooking",
  "Crafting",
  "Creating",
  "Crunching",
  "Deciphering",
  "Deliberating",
  "Determining",
  "Discombobulating",
  "Doing",
  "Effecting",
  "Elucidating",
  "Enchanting",
  "Envisioning",
  "Finagling",
  "Flibbertigibbeting",
  "Forging",
  "Forming",
  "Frolicking",
  "Generating",
  "Germinating",
  "Hatching",
  "Herding",
  "Honking",
  "Ideating",
  "Imagining",
  "Incubating",
  "Inferring",
  "Manifesting",
  "Marinating",
  "Meandering",
  "Moseying",
  "Mulling",
  "Mustering",
  "Musing",
  "Noodling",
  "Percolating",
  "Perusing",
  "Philosophising",
  "Pontificating",
  "Pondering",
  "Processing",
  "Puttering",
  "Puzzling",
  "Reticulating",
  "Ruminating",
  "Scheming",
  "Schlepping",
  "Shimmying",
  "Simmering",
  "Smooshing",
  "Spelunking",
  "Spinning",
  "Stewing",
  "Sussing",
  "Synthesizing",
  "Thinking",
  "Tinkering",
  "Transmuting",
  "Unfurling",
  "Unravelling",
  "Vibing",
  "Wandering",
  "Whirring",
  "Wibbling",
  "Working",
  "Wrangling",
];
function Loader() {
  const randomWord = useMemo(() => {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
  }, []);

  return <Shimmer>{`${randomWord}...`}</Shimmer>;
}
