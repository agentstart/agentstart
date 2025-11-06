/* agent-frontmatter:start
AGENT: AgentStart prompt input component
PURPOSE: Integrated prompt input with file attachments, queue, and usage display
USAGE: <PromptInput threadId={threadId} />
EXPORTS: PromptInput, PromptInputProps
FEATURES:
  - Dual mode: create new thread or send message to existing thread
  - File attachments via drag-and-drop, paste, or picker
  - Message queue management
  - Usage summary display
  - Integrated state management
SEARCHABLE: prompt input, message input, thread creation, chat input, attachments
agent-frontmatter:end */

"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BugIcon,
  FileIcon,
  ImageIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentUsageSummary } from "agentstart/agent";
import type {
  BlobFile,
  BlobFileList,
  QueuedAgentMessage,
} from "agentstart/client";
import {
  useAgentStartContext,
  useAgentStore,
  useBlobFiles,
  useDataPart,
} from "agentstart/client";
import { type FileUIPart, isFileUIPart } from "ai";
import { nanoid } from "nanoid";
import {
  type ChangeEvent,
  type ClipboardEventHandler,
  type FormEvent,
  type FormEventHandler,
  Fragment,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { Spinner } from "@/components/ui/spinner";
import type { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
} from "./context";
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
} from "./queue";

// ============================================================================
// Types
// ============================================================================

export interface PromptInputProps {
  className?: string;
  threadId?: string;
  initialUsage?: AgentUsageSummary;
}

type SendState = "idle" | "streaming" | "uploading";

type SendButtonProps = {
  children: ReactNode;
  className?: string;
  input: string;
  attachmentsCount: number;
  sendState: SendState;
};

type AddAttachmentsMenuProps = {
  onOpenFileDialog: () => void;
};

type UsageDisplayProps = {
  summary: AgentUsageSummary;
};

type MessageQueueProps = {
  messageQueue: QueuedAgentMessage[];
  onSend: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
};

type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart & { id: string };
  onRemove: (id: string) => void;
};

type PromptInputAttachmentsProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  files: (FileUIPart & { id: string })[];
  children: (attachment: FileUIPart & { id: string }) => ReactNode;
};

type PromptInputMessage = {
  text?: string;
  files?: FileUIPart[];
};

type PromptInputFormProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  attachments: (FileUIPart & { id: string })[];
  onAddFiles: (files: File[] | FileList) => void;
  onClearFiles: () => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

type PromptInputTextareaProps = React.ComponentProps<typeof Textarea> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  attachments: (FileUIPart & { id: string })[];
  onRemoveAttachment: (id: string) => void;
  onAddFiles: (files: File[]) => void;
};

// ============================================================================
// Helper Functions
// ============================================================================

function summarizeQueuedMessage(queued: QueuedAgentMessage): string {
  const raw = queued.text?.trim() ?? "";
  const attachmentsCount = queued.files?.length ?? 0;

  if (!raw) {
    return attachmentsCount === 1
      ? "Queued attachment"
      : attachmentsCount > 0
        ? `${attachmentsCount} queued attachments`
        : "Queued message";
  }

  const firstLine = raw.split("\n")[0]?.trim() || "Queued message";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}

function summarizeQueuedRemainder(queued: QueuedAgentMessage): string {
  const raw = queued.text?.trim() ?? "";
  if (!raw) return "";

  const lines = raw.split("\n").filter((line) => line.trim());
  if (lines.length <= 1) return "";

  const remainder = lines.slice(1).join(" ").replace(/\s+/g, " ").trim();
  return remainder.length > 120 ? `${remainder.slice(0, 117)}…` : remainder;
}

// ============================================================================
// Small Utility Components
// ============================================================================

function SendButton({
  children,
  className,
  input,
  attachmentsCount,
  sendState,
}: SendButtonProps) {
  const hasText = input.trim().length > 0;
  const hasAttachments = attachmentsCount > 0;
  const isStreaming = sendState === "streaming";
  const isUploading = sendState === "uploading";
  const shouldDisable =
    (!isStreaming && !hasText && !hasAttachments) || isUploading;

  return (
    <Button
      aria-label="Submit"
      className={className}
      disabled={shouldDisable}
      size="icon-sm"
      type="submit"
      variant="default"
    >
      {children}
    </Button>
  );
}

function AddAttachmentsMenu({ onOpenFileDialog }: AddAttachmentsMenuProps) {
  return (
    <div className="flex items-center gap-1">
      <Menu>
        <MenuTrigger
          render={<Button size="icon-sm" type="button" variant="outline" />}
        >
          <PlusIcon className="size-4" weight="bold" />
        </MenuTrigger>
        <MenuPopup align="start">
          <MenuItem
            onClick={(e) => {
              e.preventDefault();
              onOpenFileDialog();
            }}
          >
            <ImageIcon className="mr-2 size-4" weight="duotone" /> Add photos or
            files
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
}

function UsageDisplay({ summary }: UsageDisplayProps) {
  return (
    <div className="flex w-full justify-end">
      <Context
        maxTokens={summary.maxTokens}
        modelId={summary.modelId}
        usage={summary.usage}
        usedTokens={summary.usedTokens}
      >
        <ContextTrigger className="gap-1" />
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
  );
}

// ============================================================================
// Attachment Components
// ============================================================================

function PromptInputAttachment({
  data,
  onRemove,
  className,
  ...props
}: PromptInputAttachmentProps) {
  const mediaType =
    data.mediaType?.startsWith("image/") && data.url ? "image" : "file";

  const AttachmentIcon = useMemo(() => {
    switch (mediaType) {
      case "image": {
        return <ImageIcon className="size-4.5 shrink-0" weight="duotone" />;
      }
      case "file": {
        return <FileIcon className="size-4.5 shrink-0" weight="duotone" />;
      }
    }
  }, [mediaType, data]);

  const AttachmentPreview = useMemo(() => {
    switch (mediaType) {
      case "image": {
        return (
          <div className="max-w-60">
            <img src={data.url} alt={data.filename} className="object-cover" />
          </div>
        );
      }
      case "file": {
        return (
          <div className="text-muted-foreground text-xs">
            <h4 className="wrap-break-word max-w-60 overflow-hidden whitespace-normal text-left font-semibold text-sm">
              {data.filename || "Unknown file"}
            </h4>
            {data.mediaType && <div>{data.mediaType}</div>}
          </div>
        );
      }
    }
  }, [mediaType, data]);

  return (
    <div
      className={cn(
        "group relative h-8 w-auto max-w-full rounded-lg border bg-background hover:bg-accent",
        className,
      )}
      key={data.id}
      {...props}
    >
      <PreviewCard delay={0}>
        <PreviewCardTrigger
          className="min-w-0 flex-1"
          render={
            <div className="flex size-full max-w-full cursor-pointer items-center justify-start gap-1 overflow-hidden px-2 text-muted-foreground">
              {AttachmentIcon}
              <h4 className="w-full max-w-40 truncate text-left font-medium text-sm [direction:rtl]">
                {data.filename || "Unknown file"}
              </h4>
            </div>
          }
        />
        <PreviewCardPopup>{AttachmentPreview}</PreviewCardPopup>
      </PreviewCard>

      <Button
        aria-label="Remove attachment"
        className="-right-1.5 -top-1.5 absolute size-5 rounded-full opacity-0 group-hover:opacity-100"
        onClick={() => onRemove(data.id)}
        size="icon"
        type="button"
        variant="outline"
      >
        <XIcon className="size-3" weight="bold" />
      </Button>
    </div>
  );
}

function PromptInputAttachments({
  files,
  className,
  children,
  ...props
}: PromptInputAttachmentsProps) {
  if (files.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden transition-[height] duration-300 ease-out",
        className,
      )}
      {...props}
    >
      <div className="space-y-2 px-2 pt-1 pb-2">
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <Fragment key={file.id}>{children(file)}</Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Form Components
// ============================================================================

function PromptInputTextarea({
  value,
  onChange,
  attachments,
  onRemoveAttachment,
  onAddFiles,
  className,
  placeholder = "Ask anything",
  ...props
}: PromptInputTextareaProps) {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter") {
      if (isComposing || e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }

    // Remove last attachment when Backspace is pressed and textarea is empty
    if (
      e.key === "Backspace" &&
      e.currentTarget.value === "" &&
      attachments.length > 0
    ) {
      e.preventDefault();
      const lastAttachment = attachments.at(-1);
      if (lastAttachment) {
        onRemoveAttachment(lastAttachment.id);
      }
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      onAddFiles(files);
    }
  };

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-17.5 w-full resize-none rounded-[inherit] px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] outline-none [scrollbar-color:var(--accent)_transparent] [scrollbar-width:thin] max-sm:min-h-20.5",
        className,
      )}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

function PromptInputForm({
  className,
  accept,
  multiple,
  globalDrop,
  attachments,
  onAddFiles,
  onClearFiles,
  fileInputRef,
  onSubmit,
  children,
  ...props
}: PromptInputFormProps) {
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = fileInputRef || internalInputRef;
  const formRef = useRef<HTMLFormElement | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchorRef.current?.closest("form");
    if (root instanceof HTMLFormElement) {
      formRef.current = root;
    }
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      onAddFiles(event.currentTarget.files);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    form.reset();

    // Convert blob URLs to data URLs
    const convertedFiles = await Promise.all(
      attachments.map(async ({ id, ...item }) => {
        if (item.url?.startsWith("blob:")) {
          const response = await fetch(item.url);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          return { ...item, url: dataUrl };
        }
        return item;
      }),
    );

    try {
      const textareas = form.querySelectorAll("textarea[name='message']");
      const text = (textareas[0] as HTMLTextAreaElement)?.value || "";
      const result = onSubmit({ text, files: convertedFiles }, event);
      await result;
      onClearFiles();
    } catch {
      // Don't clear on error
    }
  };

  // Drag & drop on form
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onAddFiles(e.dataTransfer.files);
      }
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [onAddFiles]);

  // Global drop (opt-in)
  useEffect(() => {
    if (!globalDrop) return;

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onAddFiles(e.dataTransfer.files);
      }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [onAddFiles, globalDrop]);

  // Cleanup blob URLs
  useEffect(
    () => () => {
      for (const f of attachments) {
        if (f.url) URL.revokeObjectURL(f.url);
      }
    },
    [attachments],
  );

  return (
    <>
      <span aria-hidden="true" className="hidden" ref={anchorRef} />
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title="Upload files"
        type="file"
      />
      <form
        className={cn("w-full", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </>
  );
}

// ============================================================================
// MessageQueue Component
// ============================================================================

function MessageQueue({
  messageQueue,
  onSend,
  onRemove,
  onMove,
}: MessageQueueProps) {
  if (messageQueue.length === 0) return null;

  return (
    <Queue className="relative mx-auto w-[95%] rounded-b-none border-none bg-secondary px-1 shadow-none">
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
                  className="flex flex-row items-center gap-2 py-0.5 hover:bg-background"
                >
                  <QueueItemIndicator />
                  <QueueItemContent title={summary}>{summary}</QueueItemContent>
                  <QueueItemAction
                    aria-label="Remove message from queue"
                    onClick={() => onRemove(queued.id)}
                  >
                    <TrashIcon className="size-3" weight="duotone" />
                  </QueueItemAction>
                  <QueueItemAction
                    aria-label="Send message now"
                    onClick={() => onSend(queued.id)}
                  >
                    <PaperPlaneTiltIcon className="size-3" weight="duotone" />
                  </QueueItemAction>
                  {remainder ? (
                    <QueueItemDescription>{remainder}</QueueItemDescription>
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
                        onClick={() => onMove(queued.id, "up")}
                      >
                        <ArrowUpIcon className="size-3" weight="bold" />
                      </QueueItemAction>
                    ) : null}
                    {index < messageQueue.length - 1 ? (
                      <QueueItemAction
                        aria-label="Move message down"
                        onClick={() => onMove(queued.id, "down")}
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
  );
}

// ============================================================================
// Main PromptInput Component
// ============================================================================

export function PromptInput({
  className,
  threadId,
  initialUsage,
}: PromptInputProps = {}) {
  const { client, orpc, navigate } = useAgentStartContext();
  const queryClient = useQueryClient();

  // Input state
  const [input, setInput] = useState("");

  // Attachments state
  const [attachments, setAttachments] = useState<
    (FileUIPart & { id: string })[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Agent store
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

  // Usage tracking
  const [usagePart] = useDataPart<"data-agentstart-usage">(
    "data-agentstart-usage",
    storeKey,
  );
  const usageSummary = usagePart ?? initialUsage ?? null;
  const showUsage = Boolean(threadId) && Boolean(usageSummary);

  // Blob files
  const {
    files: blobFiles,
    setFiles: setBlobFiles,
    processFiles,
    clearFiles,
    isUploading,
  } = useBlobFiles(client);

  const createThreadMutation = useMutation(
    orpc.thread.create.mutationOptions(),
  );

  // Attachment handlers
  const addFiles = (files: File[] | FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    setAttachments((prev) =>
      prev.concat(
        incoming.map((file) => ({
          id: nanoid(),
          type: "file" as const,
          url: URL.createObjectURL(file),
          mediaType: file.type,
          filename: file.name,
        })),
      ),
    );
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) URL.revokeObjectURL(found.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAttachments = () => {
    setAttachments((prev) => {
      for (const f of prev) if (f.url) URL.revokeObjectURL(f.url);
      return [];
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Sync attachments with blob files
  useEffect(() => {
    if (attachments.length === 0) {
      setBlobFiles([]);
      return;
    }

    const normalized: BlobFile[] = attachments.map(
      ({ id: _id, ...rest }) => rest,
    );
    setBlobFiles(normalized);
  }, [attachments, setBlobFiles]);

  const handleMessageSubmit = async (message: {
    text?: string;
    files?: BlobFileList;
  }) => {
    let files: FileList | FileUIPart[] | undefined;

    if (message?.files && Array.isArray(message.files)) {
      if (message.files.every((file) => file instanceof File)) {
        const dataTransfer = new DataTransfer();
        for (const file of message.files) {
          dataTransfer.items.add(file);
        }
        files = dataTransfer.files;
      } else if (
        message.files.every(
          (file) => !(file instanceof File) && isFileUIPart(file),
        )
      ) {
        files = message.files as FileUIPart[];
      }
    }

    return sendMessage(
      { text: message?.text ?? "", files },
      { body: { threadId } },
    );
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const isBusy = ["streaming", "submitted"].includes(status);
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(blobFiles.length);
    if (!(hasText || hasAttachments)) return;

    let processedFiles: BlobFileList | undefined;
    try {
      processedFiles = await processFiles();
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "File processing failed",
      );
      return;
    }

    if (threadId) {
      const trimmedText = message.text?.trim() ?? "";
      const queueText = trimmedText.length > 0 ? trimmedText : undefined;
      let queueFiles: FileUIPart[] | undefined;
      if (processedFiles) {
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
        clearAttachments();
        return;
      }
    }

    if (isBusy) {
      stop();
      return;
    }

    if (threadId) {
      setInput("");
      clearFiles();
      clearAttachments();
      handleMessageSubmit({
        text: message.text?.trim() ?? "",
        files: processedFiles,
      });
    } else {
      const trimmedText = message.text?.trim() ?? "";
      setNewThreadDraft({
        text: trimmedText,
        files: processedFiles,
      });

      try {
        setInput("");
        clearFiles();
        clearAttachments();
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

  const getSendIcon = () => {
    if (hasError) return <BugIcon className="size-4.5" weight="duotone" />;
    if (sendState === "streaming")
      return <StopIcon className="size-4.5" weight="bold" />;
    if (sendState === "uploading") return <Spinner className="size-4.5" />;
    if (isPending) return <Spinner className="size-4.5" />;
    return <ArrowUpIcon className="size-4.5" weight="bold" />;
  };

  const handleSendQueuedMessage = async (queuedId: string) => {
    if (!threadId) return;
    const queued = takeQueuedMessageById(queuedId);
    if (!queued) return;
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
    if (!threadId || !id || !newThreadDraft) return;

    const { text, files } = newThreadDraft;
    const storedText = text?.trim() ?? "";
    const fileCount =
      files instanceof FileList
        ? files.length
        : Array.isArray(files)
          ? files.length
          : 0;

    if (!storedText && fileCount === 0) return;

    setNewThreadDraft(null);

    void (async () => {
      try {
        await handleMessageSubmit({ text: storedText, files });
      } catch {
        setNewThreadDraft({ text: storedText, files });
      }
    })();
  }, [id, newThreadDraft, setNewThreadDraft, threadId]);

  return (
    <div className="mx-auto flex w-full flex-col px-4 sm:min-w-[390px] sm:max-w-3xl">
      <MessageQueue
        messageQueue={messageQueue}
        onSend={handleSendQueuedMessage}
        onRemove={removeQueuedMessage}
        onMove={moveQueuedMessage}
      />
      <PromptInputForm
        globalDrop
        multiple
        attachments={attachments}
        onAddFiles={addFiles}
        onClearFiles={clearAttachments}
        fileInputRef={fileInputRef}
        onSubmit={handleSubmit}
        className={cn(
          "mx-auto w-full max-w-full rounded-[22px] bg-secondary p-1.5 *:data-[slot=input-group]:rounded-[22px] sm:min-w-[390px] sm:max-w-3xl",
          className,
        )}
      >
        <PromptInputAttachments files={attachments}>
          {(attachment) => (
            <PromptInputAttachment
              data={attachment}
              onRemove={removeAttachment}
            />
          )}
        </PromptInputAttachments>

        {/* Wrapper */}
        <div
          data-slot="textarea-control"
          className={cn(
            "field-sizing-content relative inline-flex max-h-60 min-h-24 w-full flex-col overflow-hidden rounded-[18px] border border-input bg-background bg-clip-padding text-base shadow-xs transition-all duration-300 has-focus-visible:has-aria-invalid:border-destructive/64 has-aria-invalid:border-destructive/36 has-focus-visible:border-ring has-disabled:opacity-64 sm:text-sm dark:bg-input/32 dark:bg-clip-border [&:has(:disabled,:focus-visible,[aria-invalid])]:shadow-none",
            className,
          )}
        >
          {/* Textarea */}
          <PromptInputTextarea
            className="px-4 pt-2"
            placeholder="Ask anything"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            onAddFiles={addFiles}
            autoFocus
          />
          {/* Addon */}
          <div className="flex items-center justify-between gap-1 px-4 pb-3">
            <AddAttachmentsMenu onOpenFileDialog={openFileDialog} />
            <div className="flex items-center gap-2">
              {showUsage && usageSummary ? (
                <UsageDisplay summary={usageSummary} />
              ) : null}

              <SendButton
                input={input}
                attachmentsCount={attachments.length}
                sendState={sendState}
              >
                {getSendIcon()}
              </SendButton>
            </div>
          </div>
        </div>
      </PromptInputForm>
    </div>
  );
}
