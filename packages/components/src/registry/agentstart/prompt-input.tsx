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
import { useAgentStore } from "agentstart/client";
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
  const storeKey = threadId ?? "default";
  const status = useAgentStore((state) => state.status, storeKey);
  const id = useAgentStore((state) => state.id, storeKey);
  const stop = useAgentStore((state) => state.stop, storeKey);
  const pendingNewThreadInput = useAgentStore(
    (state) => state.pendingNewThreadInput,
  );
  const setPendingNewThreadInput = useAgentStore(
    (state) => state.setPendingNewThreadInput,
  );

  const createThreadMutation = useMutation(
    orpc.thread.create.mutationOptions(),
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (["streaming", "submitted"].includes(status)) {
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
      setPendingNewThreadInput({
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
        setPendingNewThreadInput(null);
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

  useEffect(() => {
    if (!threadId || !onMessageSubmit || !id || !pendingNewThreadInput) {
      return;
    }

    const { text, files } = pendingNewThreadInput;
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

    setPendingNewThreadInput(null);

    void (async () => {
      try {
        await onMessageSubmit({ text: storedText, files });
      } catch {
        setPendingNewThreadInput({ text: storedText, files });
      }
    })();
  }, [
    id,
    onMessageSubmit,
    pendingNewThreadInput,
    setPendingNewThreadInput,
    threadId,
  ]);

  return (
    <PromptInputProvider>
      <BasePromptInput
        globalDrop
        multiple
        onSubmit={handleSubmit}
        className={cn(
          "mx-auto w-full max-w-full rounded-[22px] bg-background *:data-[slot=input-group]:rounded-[22px] sm:min-w-[390px] sm:max-w-[768px]",
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
