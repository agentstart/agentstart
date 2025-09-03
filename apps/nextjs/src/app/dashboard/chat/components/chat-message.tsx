// AGENT: Chat message component
// PURPOSE: Renders individual chat messages with sources and reasoning
// USAGE: <ChatMessage message={message} status={status} />
// FEATURES:
//   - Displays message content with proper formatting
//   - Shows sources for assistant messages
//   - Renders reasoning sections
//   - Action buttons (copy, regenerate, edit)
// SEARCHABLE: chat message, message component, ai response, actions

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Actions, Action } from "@/components/ai-elements/actions";
import { CopyIcon, RefreshCcwIcon, PencilIcon } from "lucide-react";
import type { UIMessage, ChatStatus, AbstractChat } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";

interface ChatMessageProps {
  message: UIMessage;
  status?: ChatStatus;
  onRegenerate?: AbstractChat<UIMessage>["regenerate"];
  onEdit?: (messageId: string, content: string) => void;
}

export function ChatMessage({
  message,
  status,
  onRegenerate,
  onEdit,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const sourceParts = message.parts.filter(
    (part) => part.type === "source-url",
  );

  // Get text content for copy/edit functionality
  const textContent = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  const handleCopy = () => {
    navigator.clipboard
      .writeText(textContent)
      .then(() => {
        toast.success("Copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate({ messageId: message.id });
    }
  };

  const handleEdit = () => {
    setEditContent(textContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  return (
    <div className="group relative space-y-1">
      {message.role === "assistant" && sourceParts.length > 0 && (
        <Sources>
          <SourcesTrigger count={sourceParts.length} />
          {sourceParts.map((part, i) => (
            <SourcesContent key={`${message.id}-source-${i}`}>
              <Source href={part.url} title={part.url} />
            </SourcesContent>
          ))}
        </Sources>
      )}
      <Message from={message.role}>
        <MessageContent>
          {message.role === "assistant" && <Logo className="mb-1 size-7" />}

          {isEditing && message.role === "user" ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="hover:bg-accent rounded-md border px-3 py-1 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            message.parts.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <Response key={`${message.id}-text-${i}`}>
                      {part.text}
                    </Response>
                  );
                case "reasoning":
                  return (
                    <Reasoning
                      key={`${message.id}-reasoning-${i}`}
                      className="w-full"
                      isStreaming={status === "streaming"}
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>{part.text}</ReasoningContent>
                    </Reasoning>
                  );
                default:
                  return null;
              }
            })
          )}
        </MessageContent>
      </Message>

      {/* Action buttons - show on hover for messages with text content */}
      {textContent && !isEditing && (
        <Actions
          className={cn(
            "mt-2 opacity-0 transition-opacity group-hover:opacity-100",
            {
              "justify-start": message.role === "assistant",
              "justify-end": message.role === "user",
            },
          )}
        >
          <Action
            className="size-6"
            onClick={handleCopy}
            label="Copy message"
            size="icon"
            variant="ghost"
          >
            <CopyIcon className="size-3.5" />
          </Action>

          {message.role === "user" && onRegenerate && (
            <Action
              className="size-6"
              onClick={handleRegenerate}
              label="Regenerate response"
              size="icon"
              variant="ghost"
            >
              <RefreshCcwIcon className="size-3.5" />
            </Action>
          )}

          {message.role === "user" && onEdit && (
            <Action
              className="size-6"
              onClick={handleEdit}
              label="Edit message"
              size="icon"
              variant="ghost"
            >
              <PencilIcon className="size-3.5" />
            </Action>
          )}
        </Actions>
      )}
    </div>
  );
}
