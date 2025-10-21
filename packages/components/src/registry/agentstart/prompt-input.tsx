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
  ArrowUpIcon,
  BugIcon,
  PlusIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { newThreadInput, useAgentStore } from "agentstart/client";
import type { FileUIPart } from "ai";
import { useEffect, useMemo, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAgentStartContext } from "./provider";

export interface PromptInputProps {
  className?: string;
  /**
   * Thread ID for chat page usage
   * - If provided: delegates message submission to onMessageSubmit
   * - If undefined: creates new thread (home page usage)
   */
  threadId?: string;
  /**
   * Custom message submit handler for chat page
   * Called instead of creating a new thread when threadId is provided
   */
  onMessageSubmit?: (message: {
    text?: string;
    files?: FileUIPart[] | FileList;
  }) => Promise<void>;
}

export function PromptInput({
  className,
  threadId,
  onMessageSubmit,
}: PromptInputProps = {}) {
  const { orpc, navigate } = useAgentStartContext();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const status = useAgentStore((state) => state.status);
  const id = useAgentStore((state) => state.id);
  const stop = useAgentStore((state) => state.stop);

  const createThreadMutation = useMutation(
    orpc.thread.create.mutationOptions(),
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (status === "streaming" || status === "submitted") {
      stop();
      return;
    }

    if (!message.text?.trim()) return;

    if (threadId && onMessageSubmit) {
      // Thread page: delegate to parent component
      setInput("");
      await onMessageSubmit({
        text: message.text ?? "",
        files: message.files,
      });
    } else {
      // Home page: create new thread and navigate
      const trimmedText = message.text?.trim() ?? "";
      newThreadInput.text = trimmedText;
      newThreadInput.files = message.files;

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
        delete newThreadInput.text;
        delete newThreadInput.files;
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
    let Icon = <ArrowUpIcon className="size-4.5" weight="bold" />;

    if (isPending) {
      Icon = <Spinner className="size-4.5" />;
    } else if (isStreaming) {
      Icon = <StopIcon className="size-4.5" weight="bold" />;
    } else if (hasError) {
      Icon = <BugIcon className="size-4.5" weight="duotone" />;
    }
    return Icon;
  }, [isPending, isStreaming, hasError]);

  useEffect(() => {
    if (!threadId || !onMessageSubmit || !id) {
      return;
    }

    const storedFiles = newThreadInput.files;
    const filesLength =
      typeof FileList !== "undefined" && storedFiles instanceof FileList
        ? storedFiles.length
        : Array.isArray(storedFiles)
          ? storedFiles.length
          : 0;
    const storedText = newThreadInput.text?.trim() ?? "";

    if (!storedText && filesLength === 0) {
      return;
    }

    const textToSubmit = storedText;
    const filesToSubmit = storedFiles;
    delete newThreadInput.text;
    delete newThreadInput.files;

    const submitStoredMessage = async () => {
      let succeeded = false;
      try {
        await onMessageSubmit({
          text: textToSubmit,
          files: filesToSubmit,
        });
        succeeded = true;
      } finally {
        if (!succeeded) {
          newThreadInput.text = textToSubmit;
          if (filesToSubmit) {
            newThreadInput.files = filesToSubmit;
          }
        }
      }
    };

    void submitStoredMessage();
  }, [id, onMessageSubmit, threadId]);

  return (
    <PromptInputProvider>
      <BasePromptInput
        globalDrop
        multiple
        onSubmit={handleSubmit}
        className={cn(
          "mx-auto w-full max-w-full rounded-[22px] bg-background sm:min-w-[390px] sm:max-w-[768px] [&>[data-slot=input-group]]:rounded-[22px]",
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
            <PromptInputSubmit
              className="cursor-pointer rounded-full"
              disabled={!input.trim() && !isStreaming}
            >
              {sendIcon}
            </PromptInputSubmit>
          </div>
        </PromptInputFooter>
      </BasePromptInput>
    </PromptInputProvider>
  );
}
