/* agent-frontmatter:start
AGENT: Agent conversation viewer
PURPOSE: Render thread messages with auto-scroll and tool-aware formatting
USAGE: <Conversation threadId={threadId} />
EXPORTS: Conversation, ConversationProps, ConversationContent, ConversationEmptyState, ConversationScrollButton
FEATURES:
  - Loads thread transcripts with TanStack Query and the AgentStart client
  - Displays AI responses and tool interactions with timeline styling
  - Keeps the conversation pinned to the latest message with scroll controls
SEARCHABLE: conversation viewer, thread messages, agentstart conversation, auto scroll
agent-frontmatter:end */

"use client";

import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  ChatSlashIcon,
  CheckIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { AgentStartUIMessage } from "agentstart/agent";
import {
  type AgentStore,
  useAgentStartContext,
  useAgentStore,
} from "agentstart/client";
import { format, formatDistanceToNow } from "date-fns";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Message, MessageContent } from "./message";
import { Response } from "./response";
import { StatusIndicators } from "./shimmer";
import { Source, Sources, SourcesContent, SourcesTrigger } from "./sources";
import { SuggestedPrompts } from "./suggested-prompts";
import { MessagePart } from "./tools/message-part-view";

// Helper types
type MessagePartType = NonNullable<AgentStartUIMessage["parts"]>[number];
type TextPart = MessagePartType & { type: "text"; text: string };
type ImagePart = MessagePartType & {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
};

// Type guards
const isTextPart = (part: MessagePartType): part is TextPart =>
  part?.type === "text" &&
  typeof part.text === "string" &&
  part.text.length > 0;

const isImagePart = (part: MessagePartType): part is ImagePart =>
  part?.type === "file" &&
  typeof (part as { mediaType?: unknown }).mediaType === "string" &&
  ((part as { mediaType?: string }).mediaType?.startsWith("image/") ?? false) &&
  typeof (part as { url?: unknown }).url === "string" &&
  ((part as { url?: string }).url?.length ?? 0) > 0;

// Helper functions
const getFileCount = (files: unknown): number => {
  if (files instanceof FileList) return files.length;
  if (Array.isArray(files)) return files.length;
  return 0;
};

const hasNewThreadDraftContent = (draft: unknown): boolean => {
  if (!draft || typeof draft !== "object") return false;
  const d = draft as { text?: string; files?: unknown };
  const hasText = (d.text?.trim() ?? "").length > 0;
  const fileCount = getFileCount(d.files);
  return hasText || fileCount > 0;
};

const copyMessageText = (message: AgentStartUIMessage): void => {
  const parts = message.parts ?? [];
  if (parts.length === 0) return;
  const text = parts.find((part) => part.type === "text")?.text ?? "";
  if (!text) return;
  void navigator.clipboard.writeText(text);
};

// Internal hook: Safe store access with fallback when useThread is not used
type SetMessagesFn = (
  messages:
    | AgentStartUIMessage[]
    | ((prev: AgentStartUIMessage[]) => AgentStartUIMessage[]),
) => void;

interface UseSafeStoreReturn {
  messages: AgentStartUIMessage[];
  safeSetMessages: SetMessagesFn;
  isUsingThread: boolean;
}

/**
 * Hook that provides safe access to agent store with fallback when useThread is not used.
 * This hook detects whether useThread has been initialized by checking if store.id is set.
 * If useThread is active, it uses the official setMessages. Otherwise, it falls back to
 * using _syncState to update the store directly.
 */
function useSafeStore(storeId: string = "default"): UseSafeStoreReturn {
  // Get current messages
  const messages = useAgentStore<AgentStartUIMessage, AgentStartUIMessage[]>(
    (state) => state.messages,
    storeId,
  );

  // Get setMessages (will be no-op if useThread is not used)
  const setMessages = useAgentStore<
    AgentStartUIMessage,
    AgentStore<AgentStartUIMessage>["setMessages"]
  >((state) => state.setMessages, storeId);

  // Get store.id to detect if useThread is active
  const threadStoreId = useAgentStore<AgentStartUIMessage, string>(
    (state) => state.id,
    storeId,
  );

  // Get _syncState as fallback mechanism
  const _syncState = useAgentStore<
    AgentStartUIMessage,
    ((newState: Partial<AgentStore<AgentStartUIMessage>>) => void) | undefined
  >((state) => (state as any)._syncState, storeId);

  // Check if useThread has been used (store.id will be set by useThread)
  const isUsingThread = Boolean(threadStoreId);

  // Create safe setMessages that works with or without useThread
  const safeSetMessages = useCallback<SetMessagesFn>(
    (newMessages) => {
      if (isUsingThread) {
        // useThread is active, use the official setMessages
        setMessages(newMessages);
      } else if (_syncState) {
        // No useThread, use _syncState to update the store directly
        const resolvedMessages =
          typeof newMessages === "function"
            ? newMessages(messages)
            : newMessages;
        _syncState({ messages: resolvedMessages });
      }
    },
    [isUsingThread, setMessages, _syncState, messages],
  );

  return {
    messages,
    safeSetMessages,
    isUsingThread,
  };
}

type RelativeTimeProps = {
  timestamp?: number | Date;
};

const RelativeTime = ({ timestamp }: RelativeTimeProps) => {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const absoluteTime = useMemo(
    () =>
      timestamp
        ? format(timestamp, "M/d/yyyy, h:mm a") // 10/28/2025, 12:04 PM
        : null,
    [timestamp],
  );

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime("");
      return;
    }

    const updateRelativeTime = () => {
      setRelativeTime(
        formatDistanceToNow(new Date(timestamp), { addSuffix: true }),
      );
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp || !relativeTime) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default text-muted-foreground text-xs">
        {relativeTime}
      </TooltipTrigger>
      <TooltipPopup>
        <p className="text-xs">{absoluteTime}</p>
      </TooltipPopup>
    </Tooltip>
  );
};

export type ConversationProps = Omit<
  ComponentProps<typeof StickToBottom>,
  "children"
> & {
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
};

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

type CopyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "children"
> & {
  onCopy: () => void;
  feedbackDuration?: number;
};

const CopyButton = ({
  onCopy,
  feedbackDuration = 3000,
  disabled,
  ...props
}: CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    onCopy();
    setIsCopied(true);

    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      timeoutRef.current = null;
    }, feedbackDuration);
  };

  return (
    <Button onClick={handleClick} disabled={disabled || isCopied} {...props}>
      {isCopied ? (
        <CheckIcon className="size-4" weight="bold" />
      ) : (
        <CopyIcon className="size-4" weight="duotone" />
      )}
      <span className="sr-only">{isCopied ? "Copied" : "Copy"}</span>
    </Button>
  );
};

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) {
    return null;
  }

  return (
    <Button
      className={cn(
        "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
        className,
      )}
      onClick={() => scrollToBottom()}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <CaretDownIcon className="size-4" weight="duotone" />
    </Button>
  );
};

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

  // Use safe store hook that handles both with and without useThread
  const { messages, safeSetMessages } = useSafeStore(resolvedStoreId);

  const status = useAgentStore<AgentStartUIMessage, UIAgentStore["status"]>(
    (state) => state.status,
    resolvedStoreId,
  );
  const storeError = useAgentStore<AgentStartUIMessage, UIAgentStore["error"]>(
    (state) => state.error,
    resolvedStoreId,
  );
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
  const hasNewThreadDraft = hasNewThreadDraftContent(newThreadDraft);

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
        safeSetMessages([]);
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
    safeSetMessages(fetchedMessages);
  }, [fetchedMessages, messages, safeSetMessages, threadId]);

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
    const parts = (message.parts ?? []) as MessagePartType[];
    const textParts = parts.filter(isTextPart);
    const imageParts = parts.filter(isImagePart);

    if (textParts.length === 0 && imageParts.length === 0) {
      return null;
    }

    return (
      <div className="flex w-full flex-col gap-2">
        {imageParts.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              imageParts.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {imageParts.map((part, index) => (
              <figure
                key={`${message.id}-image-${index}`}
                className="relative overflow-hidden rounded-md border bg-muted"
              >
                <img
                  alt={part.filename || `Attachment ${index + 1}`}
                  className="h-full max-h-60 w-full object-cover"
                  loading="lazy"
                  src={part.url}
                />
                {part.filename ? (
                  <figcaption className="sr-only">{part.filename}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}

        {textParts.map((part, index) => (
          <Response key={`${message.id}-text-${index}`}>{part.text}</Response>
        ))}
      </div>
    );
  }, []);

  const renderUserActions = (message: AgentStartUIMessage) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
      <CopyButton
        className="size-7"
        size="icon-sm"
        variant="ghost"
        onCopy={() => copyMessageText(message)}
      />

      <RelativeTime timestamp={message.metadata?.createdAt} />
    </div>
  );

  const renderAssistantActions = (message: AgentStartUIMessage) => {
    const parts = message.parts ?? [];
    const sourceParts = parts.filter((part) => part.type === "source-url");

    return (
      <>
        <div className="flex w-full items-center justify-start gap-1 opacity-0 group-hover:opacity-100">
          <Button
            className="size-7"
            size="icon-sm"
            variant="ghost"
            onClick={() =>
              regenerate({
                body: {
                  threadId,
                },
              })
            }
          >
            <ArrowsClockwiseIcon className="size-4" weight="duotone" />
            <span className="sr-only">Retry</span>
          </Button>

          <CopyButton
            className="size-7"
            size="icon-sm"
            variant="ghost"
            onCopy={() => copyMessageText(message)}
          />

          <RelativeTime timestamp={message.metadata?.createdAt} />
        </div>

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
  };

  const fetchError = isError ? (queryError as Error) : null;
  const hasMessages = messages.length > 0;
  const showInitialLoading =
    Boolean(threadId) &&
    !hasMessages &&
    (hasNewThreadDraft || isLoading || (isFetching && !fetchedMessages));

  const defaultEmptyState = (
    <ConversationEmptyState
      icon={
        <ChatSlashIcon
          className="size-12 text-muted-foreground"
          weight="duotone"
        />
      }
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
      icon={
        <ChatSlashIcon className="size-12 text-destructive" weight="duotone" />
      }
      title="Unable to load messages"
      description={fetchError.message ?? "Please try again."}
    >
      <Button onClick={() => refetch()} type="button" variant="outline">
        Retry
      </Button>
    </ConversationEmptyState>
  );

  const resolvedEmptyState = emptyState ?? defaultEmptyState;
  const resolvedLoadingState = loadingState ?? defaultLoadingState;
  const resolvedErrorState = fetchError
    ? (errorState?.(fetchError, () => refetch()) ?? defaultErrorState)
    : null;
  const shouldShowStatusIndicators =
    status === "streaming" || status === "submitted";

  return (
    <StickToBottom
      className={cn(
        "relative flex size-full flex-col [scrollbar-color:var(--accent)_transparent] [scrollbar-width:thin]",
        className,
      )}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    >
      <StickToBottom.Content
        className={cn(
          "mx-auto flex flex-1 flex-col gap-4 p-0 sm:min-w-[390px] sm:max-w-3xl",
          contentClassName,
        )}
      >
        {resolvedErrorState ? (
          resolvedErrorState
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
                      "text-base ltr:rounded-br-none! rtl:rounded-bl-none!":
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
            {shouldShowStatusIndicators && <StatusIndicators />}
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
                    <ArrowsClockwiseIcon className="size-4" weight="duotone" />
                    Retry
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </div>
        ) : showInitialLoading ? (
          resolvedLoadingState
        ) : (
          resolvedEmptyState
        )}

        <SuggestedPrompts
          threadId={threadId}
          className={cn({
            "pt-0": !hasMessages,
          })}
        />
      </StickToBottom.Content>

      <ConversationScrollButton
        className={cn("bottom-42", {
          "bottom-52": hasQueue,
        })}
      />
    </StickToBottom>
  );
}
