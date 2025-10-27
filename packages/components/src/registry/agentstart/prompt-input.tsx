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
import type {
  BlobAttachment,
  BlobAttachmentList,
  QueuedAgentMessage,
} from "agentstart/client";
import {
  useAgentStore,
  useBlobAttachments,
  useDataPart,
} from "agentstart/client";
import { type FileUIPart, isFileUIPart } from "ai";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  usePromptInputAttachments,
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

type SendState = "idle" | "streaming" | "uploading";

export function PromptInput({
  className,
  threadId,
  initialUsage,
}: PromptInputProps = {}) {
  const { client, orpc, navigate } = useAgentStartContext();
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

  // Blob attachments hook
  const {
    files: blobFiles,
    setFiles: setBlobFiles,
    processFiles,
    clearFiles,
    isUploading,
  } = useBlobAttachments(client);

  const createThreadMutation = useMutation(
    orpc.thread.create.mutationOptions(),
  );
  const handleMessageSubmit = async (message: {
    text?: string;
    files?: BlobAttachmentList;
  }) => {
    const files = (() => {
      if (message?.files) {
        if (Array.isArray(message.files)) {
          if (message.files.every((file) => file instanceof File)) {
            const dataTransfer = new DataTransfer();
            message.files.forEach((file) => {
              dataTransfer.items.add(file);
            });
            return dataTransfer.files;
          }
          if (
            message.files.every(
              (file) => !(file instanceof File) && isFileUIPart(file),
            )
          ) {
            return message.files as FileUIPart[];
          }
        }
      }
    })();
    return sendMessage(
      { text: message?.text ?? "", files },
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
    const hasAttachments = Boolean(blobFiles.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Process files: upload to blob storage if enabled, otherwise return as-is
    let processedFiles: BlobAttachmentList | undefined;
    try {
      processedFiles = await processFiles();
    } catch (error) {
      // processFiles handles validation and upload errors, just show alert
      console.error(
        error instanceof Error ? error.message : "File processing failed",
      );
      return;
    }

    if (threadId) {
      const trimmedText = message.text?.trim() ?? "";
      const queueText = trimmedText.length > 0 ? trimmedText : undefined;
      // Queue only supports FileUIPart[]
      let queueFiles: FileUIPart[] | undefined;
      if (processedFiles) {
        // Convert FileList to array if needed
        const fileArray =
          processedFiles instanceof FileList
            ? Array.from(processedFiles)
            : processedFiles;
        queueFiles = fileArray.filter(
          (file): file is FileUIPart => "type" in file && file.type === "file",
        );
      }
      const shouldQueue = isBusy || messageQueue.length > 0;

      if (shouldQueue) {
        enqueueQueuedMessage({
          text: queueText,
          files: queueFiles,
        });
        setInput("");
        clearFiles();
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
      clearFiles();
      handleMessageSubmit({
        text: message.text?.trim() ?? "",
        files: processedFiles,
      });
    } else {
      // Home page: create new thread and navigate
      const trimmedText = message.text?.trim() ?? "";
      setNewThreadDraft({
        text: trimmedText,
        files: processedFiles,
      });

      try {
        setInput("");
        clearFiles();
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
  const sendState: SendState = isStreaming
    ? "streaming"
    : isUploading
      ? "uploading"
      : "idle";

  const sendIcon = useMemo(() => {
    if (hasError) return <BugIcon className="size-4.5" weight="duotone" />;
    if (sendState === "streaming") {
      return <StopIcon className="size-4.5" weight="bold" />;
    }
    if (sendState === "uploading") {
      return <Spinner className="size-4.5" />;
    }
    if (isPending) return <Spinner className="size-4.5" />;
    return <ArrowUpIcon className="size-4.5" weight="bold" />;
  }, [hasError, isPending, sendState]);

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
      <FilesSyncHandler setBlobFiles={setBlobFiles} />
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
                    const attachments =
                      (queued.files instanceof FileList
                        ? Array.from(queued.files)
                        : queued.files) ?? [];
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
                                file instanceof File
                                  ? file.name
                                  : (file.filename ??
                                    file.mediaType ??
                                    `Attachment ${fileIndex + 1}`);
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
              className="px-4 ring-0! before:shadow-none! [&>textarea]:resize-none [&>textarea]:p-0"
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
                    <ContextContent className="flex w-full max-w-xs flex-col lg:max-w-sm">
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

              <SendButton
                className="cursor-pointer rounded-full"
                input={input}
                sendState={sendState}
              >
                {sendIcon}
              </SendButton>
            </div>
          </PromptInputFooter>
        </BasePromptInput>
      </div>
    </PromptInputProvider>
  );
}

function SendButton({
  children,
  className,
  input,
  sendState,
}: {
  children: ReactNode;
  className?: string;
  input: string;
  sendState: SendState;
}) {
  const attachments = usePromptInputAttachments();
  const hasText = input.trim().length > 0;
  const hasAttachments = attachments.files.length > 0;
  const isStreaming = sendState === "streaming";
  const isUploading = sendState === "uploading";
  const shouldDisable =
    (!isStreaming && !hasText && !hasAttachments) || isUploading;

  return (
    <PromptInputSubmit className={className} disabled={shouldDisable}>
      {children}
    </PromptInputSubmit>
  );
}

/**
 * Internal component to sync PromptInputProvider files with blob files
 * Must be inside PromptInputProvider to use usePromptInputAttachments
 */
function FilesSyncHandler({
  setBlobFiles,
}: {
  setBlobFiles: (files: BlobAttachmentList) => void;
}) {
  const promptInputAttachments = usePromptInputAttachments();

  useEffect(() => {
    const currentFiles = promptInputAttachments?.files ?? [];

    if (currentFiles.length === 0) {
      setBlobFiles([]);
      return;
    }

    const normalized: BlobAttachment[] = currentFiles.map((file) => {
      if (file instanceof File) {
        return file;
      }
      if (isFileUIPart(file)) {
        const { id: _id, ...rest } = file;
        return rest as FileUIPart;
      }
      return file as FileUIPart;
    });

    setBlobFiles(normalized);
  }, [promptInputAttachments?.files, setBlobFiles]);

  return null;
}
