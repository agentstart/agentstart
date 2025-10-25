/* agent-frontmatter:start
AGENT: AgentStart prompt input component
PURPOSE: Reusable prompt input for both home page (create thread) and chat page (send message)
USAGE: <PromptInput threadId={threadId} onMessageSubmit={handler} />
EXPORTS: PromptInput, PromptInputProps
FEATURES:
  - Dual mode: create new thread or send message to existing thread
  - File attachments via drag-and-drop or picker
  - Loading/error state visualization with icons
  - Integrates with TanStack Query for thread creation
SEARCHABLE: prompt input, message input, thread creation, chat input
agent-frontmatter:end */

"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BugIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentUsageSummary } from "agentstart/agent";
import type { QueuedAgentMessage } from "agentstart/client";
import { useAgentStore, useDataPart } from "agentstart/client";
import type { FileUIPart } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import {
  PromptInput as BasePromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Queue,
  QueueItem,
  QueueItemAction,
  QueueItemActions,
  QueueItemAttachment,
  QueueItemContent,
  QueueItemDescription,
  QueueItemFile,
  QueueItemIndicator,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAgentStartContext } from "./provider";

export interface PromptInputProps {
  className?: string;
  /**
   * Thread ID for thread page usage
   */
  threadId?: string;
  /**
   * Optional initial usage payload to hydrate the UI before the store syncs.
   */
  initialUsage?: AgentUsageSummary;
}

export function PromptInput({
  className,
  threadId,
  initialUsage,
}: PromptInputProps = {}) {
  const { orpc, navigate } = useAgentStartContext();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const storeKey = threadId ?? "default";
  const status = useAgentStore((state) => state.status, storeKey);
  const id = useAgentStore((state) => state.id, storeKey);
  const stop = useAgentStore((state) => state.stop, storeKey);
  const sendMessage = useAgentStore((state) => state.sendMessage, storeKey);
  const messageQueue = useAgentStore((state) => state.messageQueue, storeKey);
  const enqueueQueuedMessage = useAgentStore(
    (state) => state.enqueueQueuedMessage,
    storeKey,
  );
  const takeQueuedMessageById = useAgentStore(
    (state) => state.takeQueuedMessageById,
    storeKey,
  );
  const removeQueuedMessage = useAgentStore(
    (state) => state.removeQueuedMessage,
    storeKey,
  );
  const moveQueuedMessage = useAgentStore(
    (state) => state.moveQueuedMessage,
    storeKey,
  );
  const prependQueuedMessage = useAgentStore(
    (state) => state.prependQueuedMessage,
    storeKey,
  );
  const newThreadDraft = useAgentStore((state) => state.newThreadDraft);
  const setNewThreadDraft = useAgentStore((state) => state.setNewThreadDraft);
  const [usagePart] = useDataPart<"data-agentstart-usage">(
    "data-agentstart-usage",
    storeKey,
  );
  const usageSummary = usagePart ?? initialUsage ?? null;
  const showUsage = Boolean(threadId) && Boolean(usageSummary);

  const createThreadMutation = useMutation(
    orpc.thread.create.mutationOptions(),
  );
  const handleMessageSubmit = async (message: {
    text?: string;
    files?: FileUIPart[] | FileList;
  }) => {
    return sendMessage(
      { text: message?.text ?? "", files: message?.files },
      {
        body: {
          threadId,
        },
      },
    );
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const isBusy = ["streaming", "submitted"].includes(status);
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    if (threadId) {
      const trimmedText = message.text?.trim() ?? "";
      const queueText = trimmedText.length > 0 ? trimmedText : undefined;
      const queueFiles =
        message.files && message.files.length > 0
          ? message.files.map((file) => ({ ...file }))
          : undefined;
      const shouldQueue = isBusy || messageQueue.length > 0;

      if (shouldQueue) {
        enqueueQueuedMessage({
          text: queueText,
          files: queueFiles,
        });
        setInput("");
        return;
      }
    }

    // If currently streaming or submitted, stop instead of submitting (queue disabled)
    if (isBusy) {
      stop();
      return;
    }

    if (threadId) {
      // Thread page: delegate to parent component
      setInput("");
      handleMessageSubmit({
        text: message.text?.trim() ?? "",
        files: message.files,
      });
    } else {
      // Home page: create new thread and navigate
      const trimmedText = message.text?.trim() ?? "";
      setNewThreadDraft({
        text: trimmedText,
        files: message.files,
      });

      try {
        setInput("");
        const { threadId: newThreadId } =
          await createThreadMutation.mutateAsync({
            visibility: "public",
          });
        navigate(`/thread/${newThreadId}`);
        queryClient.invalidateQueries(
          orpc.thread.list.queryOptions({ input: {} }),
        );
      } catch (error) {
        setNewThreadDraft(null);
        setInput(message.text ?? "");
        throw error;
      }
    }
  };

  const isPending = threadId
    ? status === "submitted"
    : createThreadMutation.isPending;
  const isStreaming = status === "streaming";
  const hasError = threadId ? false : createThreadMutation.isError;

  const sendIcon = useMemo(() => {
    if (hasError) return <BugIcon className="size-4.5" weight="duotone" />;
    if (isStreaming) return <StopIcon className="size-4.5" weight="bold" />;
    if (isPending) return <Spinner className="size-4.5" />;
    return <ArrowUpIcon className="size-4.5" weight="bold" />;
  }, [isPending, isStreaming, hasError]);

  const summarizeQueuedMessage = useCallback((queued: QueuedAgentMessage) => {
    const raw = queued.text?.trim() ?? "";
    const attachmentsCount = queued.files?.length ?? 0;
    if (!raw) {
      if (attachmentsCount > 0) {
        return attachmentsCount === 1
          ? "Queued attachment"
          : `${attachmentsCount} queued attachments`;
      }
      return "Queued message";
    }
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return "Queued message";
    }
    const firstLine = lines[0];
    if (!firstLine) {
      return "Queued message";
    }
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
  }, []);

  const summarizeQueuedRemainder = useCallback((queued: QueuedAgentMessage) => {
    const raw = queued.text?.trim() ?? "";
    if (!raw) {
      return "";
    }
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      return "";
    }
    const remainder = lines.slice(1).join(" ").replace(/\s+/g, " ").trim();
    if (remainder.length === 0) {
      return "";
    }
    return remainder.length > 120 ? `${remainder.slice(0, 117)}…` : remainder;
  }, []);

  const handleSendQueuedMessage = async (queuedId: string) => {
    if (!threadId) {
      return;
    }
    const queued = takeQueuedMessageById(queuedId);
    if (!queued) {
      return;
    }
    if (["streaming", "submitted"].includes(status)) {
      try {
        await stop();
      } catch (error) {
        console.error(
          "Failed to stop active message before sending queued item",
          error,
        );
      }
    }
    try {
      await handleMessageSubmit({
        text: queued.text ?? "",
        files: queued.files,
      });
    } catch (error) {
      console.error("Failed to send queued message immediately", error);
      prependQueuedMessage(queued);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: is fine
  useEffect(() => {
    if (!threadId || !id || !newThreadDraft) {
      return;
    }

    const { text, files } = newThreadDraft;
    const storedText = text?.trim() ?? "";
    const fileCount =
      files instanceof FileList
        ? files.length
        : Array.isArray(files)
          ? files.length
          : 0;

    if (!storedText && fileCount === 0) {
      return;
    }

    setNewThreadDraft(null);

    void (async () => {
      try {
        await handleMessageSubmit({ text: storedText, files });
      } catch {
        setNewThreadDraft({ text: storedText, files });
      }
    })();
  }, [id, newThreadDraft, setNewThreadDraft, threadId]);

  const showQueue = Boolean(threadId) && messageQueue.length > 0;

  return (
    <PromptInputProvider>
      <div className="mx-auto flex w-full flex-col sm:min-w-[390px] sm:max-w-3xl">
        {showQueue ? (
          <Queue className="relative mx-auto w-[95%] rounded-b-none border-input border-b-0">
            <QueueSection>
              <QueueSectionTrigger className="py-1">
                <QueueSectionLabel count={messageQueue.length} label="Queued" />
              </QueueSectionTrigger>
              <QueueSectionContent className="pt-1">
                <div className="flex flex-col gap-1">
                  {messageQueue.map((queued, index) => {
                    const summary = summarizeQueuedMessage(queued);
                    const remainder = summarizeQueuedRemainder(queued);
                    const attachments = queued.files ?? [];
                    const attachmentsLabel =
                      attachments.length > 0
                        ? `${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`
                        : null;

                    return (
                      <QueueItem
                        key={queued.id}
                        className="flex flex-row items-center gap-2"
                      >
                        <QueueItemIndicator />
                        <QueueItemContent title={summary}>
                          {summary}
                        </QueueItemContent>
                        <QueueItemAction
                          aria-label="Remove message from queue"
                          onClick={() => removeQueuedMessage(queued.id)}
                        >
                          <TrashIcon className="size-3" weight="duotone" />
                        </QueueItemAction>
                        <QueueItemAction
                          aria-label="Send message now"
                          onClick={() => handleSendQueuedMessage(queued.id)}
                        >
                          <PaperPlaneTiltIcon
                            className="size-3"
                            weight="duotone"
                          />
                        </QueueItemAction>
                        {remainder ? (
                          <QueueItemDescription>
                            {remainder}
                          </QueueItemDescription>
                        ) : null}
                        {attachmentsLabel ? (
                          <QueueItemDescription>
                            {attachmentsLabel}
                          </QueueItemDescription>
                        ) : null}
                        <QueueItemActions>
                          {index > 0 ? (
                            <QueueItemAction
                              aria-label="Move message up"
                              onClick={() => moveQueuedMessage(queued.id, "up")}
                            >
                              <ArrowUpIcon className="size-3" weight="bold" />
                            </QueueItemAction>
                          ) : null}
                          {index < messageQueue.length - 1 ? (
                            <QueueItemAction
                              aria-label="Move message down"
                              onClick={() =>
                                moveQueuedMessage(queued.id, "down")
                              }
                            >
                              <ArrowDownIcon className="size-3" weight="bold" />
                            </QueueItemAction>
                          ) : null}
                        </QueueItemActions>

                        {attachments.length > 0 ? (
                          <QueueItemAttachment>
                            {attachments.map((file, fileIndex) => {
                              const filename =
                                file.filename ??
                                file.mediaType ??
                                `Attachment ${fileIndex + 1}`;
                              const key = `${queued.id}-attachment-${fileIndex}`;
                              return (
                                <QueueItemFile key={key} title={filename}>
                                  {filename}
                                </QueueItemFile>
                              );
                            })}
                          </QueueItemAttachment>
                        ) : null}
                      </QueueItem>
                    );
                  })}
                </div>
              </QueueSectionContent>
            </QueueSection>
          </Queue>
        ) : null}
        <BasePromptInput
          globalDrop
          multiple
          onSubmit={handleSubmit}
          className={cn(
            "mx-auto w-full max-w-full rounded-[22px] bg-background *:data-[slot=input-group]:rounded-[22px] sm:min-w-[390px] sm:max-w-3xl",
            className,
          )}
        >
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              className="pl-4"
              placeholder="Ask anything"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  className="cursor-pointer rounded-full"
                  variant="outline"
                >
                  <PlusIcon className="size-4" weight="bold" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <div className="flex items-center gap-2">
              {showUsage && usageSummary ? (
                <div className="flex w-full justify-end">
                  <Context
                    maxTokens={usageSummary.maxTokens}
                    modelId={usageSummary.modelId}
                    usage={usageSummary.usage}
                    usedTokens={usageSummary.usedTokens}
                  >
                    <ContextTrigger />
                    <ContextContent className="w-full max-w-xs lg:max-w-sm">
                      <ContextContentHeader />
                      <ContextContentBody className="space-y-2">
                        <ContextInputUsage />
                        <ContextOutputUsage />
                        <ContextReasoningUsage />
                        <ContextCacheUsage />
                      </ContextContentBody>
                      <ContextContentFooter />
                    </ContextContent>
                  </Context>
                </div>
              ) : null}

              <PromptInputSubmit
                className="cursor-pointer rounded-full"
                disabled={!input.trim() && !isStreaming}
              >
                {sendIcon}
              </PromptInputSubmit>
            </div>
          </PromptInputFooter>
        </BasePromptInput>
      </div>
    </PromptInputProvider>
  );
}
