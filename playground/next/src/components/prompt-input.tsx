"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PromptInput as BasePromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { client } from "@/lib/agent-client";

/**
 * PromptInput component - Main entry point for creating new threads
 *
 * Flow:
 * 1. User enters prompt and submits
 * 2. Streaming API creates thread in database
 * 3. Checks sandbox quota availability
 * 4. May queue if all sandboxes are busy (with retry logic)
 * 5. Creates sandbox environment
 * 6. Navigates to thread page when complete
 *
 * Status updates are displayed in real-time with appropriate styling
 */
export function PromptInput() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (message.text?.trim()) {
      setIsCreating(true);

      try {
        // Call the streaming thread creation API
        const { threadId } = await client.thread.create();
        router.push(`/thread/${threadId}`);
      } catch (error) {
        console.error("Failed to create thread:", error);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const status = isCreating ? "submitted" : undefined;

  return (
    <BasePromptInput
      onSubmit={handleSubmit}
      className="mt-4"
      globalDrop
      multiple
    >
      <PromptInputBody>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptInputTextarea
          onChange={(e) => setInput(e.target.value)}
          value={input}
          autoFocus
          disabled={isCreating}
        />
      </PromptInputBody>
      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputSubmit disabled={!input || isCreating} status={status} />
      </PromptInputToolbar>
    </BasePromptInput>
  );
}
