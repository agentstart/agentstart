/* agent-frontmatter:start
AGENT: Conversation message renderer
PURPOSE: Render individual user and assistant messages with actions and content
USAGE: Import and use in conversation views to display message bubbles
EXPORTS: ConversationMessage, ConversationMessageProps
FEATURES:
  - Renders user messages with image attachments and text
  - Renders assistant messages with tool parts and streaming
  - Includes message actions (copy, retry, timestamp)
  - Handles source citations display
SEARCHABLE: conversation message, message renderer, user message, assistant message
agent-frontmatter:end */

"use client";

import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import type { AgentStartUIMessage } from "agentstart/agent";
import { type AgentStore, useAgentStartContext } from "agentstart/client";
import { isToolUIPart } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message, MessageContent } from "../message";
import { RelativeTime } from "../relative-time";
import { Response } from "../response";
import { Source, Sources, SourcesContent, SourcesTrigger } from "../sources";
import { MessagePart } from "../tools/message-part-view";

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
  typeof part.mediaType === "string" &&
  (part.mediaType?.startsWith("image/") ?? false) &&
  typeof part.url === "string" &&
  (part.url?.length ?? 0) > 0;

const copyMessageText = (message: AgentStartUIMessage): void => {
  const parts = message.parts ?? [];
  if (parts.length === 0) return;

  const contentParts: string[] = [];
  const sources: Array<{ url: string; title?: string }> = [];

  for (const part of parts) {
    // Text content
    if (part.type === "text" && part.text) {
      contentParts.push(part.text);
    }
    // Reasoning blocks
    else if (part.type === "reasoning" && part.text) {
      contentParts.push(`[Thinking]\n${part.text}`);
    }
    // Tool executions
    else if (isToolUIPart(part)) {
      const toolName = part.type.replace("tool-", "");
      let toolSection = `[Tool: ${toolName}]`;

      // Format tool input based on type
      if (part.input) {
        if (part.type === "tool-bash" && part.input.command) {
          toolSection += `\nCommand: ${part.input.command}`;
        } else if (part.type === "tool-read" && part.input.filePath) {
          toolSection += `\nFile: ${part.input.filePath}`;
        } else if (part.type === "tool-write" && part.input.filePath) {
          toolSection += `\nFile: ${part.input.filePath}`;
        } else if (part.type === "tool-edit" && part.input.filePath) {
          toolSection += `\nFile: ${part.input.filePath}`;
        } else if (part.type === "tool-glob" && part.input.pattern) {
          toolSection += `\nPattern: ${part.input.pattern}`;
        } else if (part.type === "tool-grep" && part.input.pattern) {
          toolSection += `\nPattern: ${part.input.pattern}`;
        } else if (part.type === "tool-ls" && part.input.path) {
          toolSection += `\nPath: ${part.input.path}`;
        } else {
          // Generic fallback for other tools
          toolSection += `\nInput: ${JSON.stringify(part.input)}`;
        }
      }

      // Format tool output
      if (part.output?.metadata) {
        if (part.type === "tool-bash") {
          if (part.output.metadata.stdout)
            toolSection += `\nOutput:\n${part.output.metadata.stdout}`;
          if (part.output.metadata.stderr)
            toolSection += `\nError:\n${part.output.metadata.stderr}`;
        } else if (part.type === "tool-read" && part.output.metadata.content) {
          toolSection += `\nContent:\n${part.output.metadata.content}`;
        } else if (
          part.type === "tool-grep" &&
          (part.output.metadata.files ||
            part.output.metadata.matches ||
            part.output.metadata.counts)
        ) {
          if (part.output.metadata.files) {
            toolSection += `\nFiles:\n${part.output.metadata.files.join("\n")}`;
          } else if (part.output.metadata.matches) {
            toolSection += `\nMatches:\n${part.output.metadata.matches.join("\n")}`;
          } else if (part.output.metadata.counts) {
            toolSection += `\nCounts:\n${part.output.metadata.counts.map((c: any) => `${c.filename}: ${c.count}`).join("\n")}`;
          }
        } else if (part.type === "tool-glob" && part.output.metadata.matches) {
          toolSection += `\nMatches:\n${part.output.metadata.matches.join("\n")}`;
        } else if (part.output.prompt) {
          toolSection += `\nResult: ${part.output.prompt}`;
        }
      } else if (part.output?.prompt) {
        toolSection += `\nResult: ${part.output.prompt}`;
      }

      contentParts.push(toolSection);
    }
    // Source URLs
    else if (part.type === "source-url") {
      const sourcePart = part;
      sources.push({
        url: sourcePart.url,
        title: sourcePart.title,
      });
    }
  }

  // Add sources at the end
  if (sources.length > 0) {
    const sourceLines = sources.map((s) => `- [${s.title || s.url}](${s.url})`);
    contentParts.push(`\nSources:\n${sourceLines.join("\n")}`);
  }

  if (contentParts.length === 0) return;

  const fullText = contentParts.join("\n\n");
  void navigator.clipboard.writeText(fullText);
};

type CopyButtonProps = {
  onCopy: () => void;
  feedbackDuration?: number;
  className?: string;
  size?: "icon-sm" | "sm" | "default" | "lg" | "icon";
  variant?:
    | "ghost"
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "link";
};

const CopyButton = ({
  onCopy,
  feedbackDuration = 3000,
  className,
  size,
  variant,
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
    <Button
      onClick={handleClick}
      disabled={isCopied}
      className={className}
      size={size}
      variant={variant}
    >
      {isCopied ? (
        <CheckIcon className="size-4" weight="bold" />
      ) : (
        <CopyIcon className="size-4" weight="duotone" />
      )}
      <span className="sr-only">{isCopied ? "Copied" : "Copy"}</span>
    </Button>
  );
};

export type ConversationMessageProps = {
  message: AgentStartUIMessage;
  isLastMessage: boolean;
  status: AgentStore<AgentStartUIMessage>["status"];
  regenerate: AgentStore<AgentStartUIMessage>["regenerate"];
};

export function ConversationMessage({
  message,
  isLastMessage,
  status,
  regenerate,
}: ConversationMessageProps) {
  const { threadId, config } = useAgentStartContext();

  const logo = config?.logo;
  const logoSrc = typeof logo === "string" ? logo : logo?.src;
  const logoAlt = typeof logo === "string" ? "Logo" : logo?.alt || "Logo";
  const logoWidth = typeof logo === "string" ? undefined : logo?.width;
  const logoHeight = typeof logo === "string" ? undefined : logo?.height;
  const renderAssistantMessage = useCallback(
    (message: AgentStartUIMessage, isLastMessage: boolean) => {
      const parts = message.parts ?? [];
      const elements: React.ReactElement[] = [];

      // Render logo if configured
      if (logoSrc) {
        // Generate fallback initials from logoAlt
        const fallbackText = logoAlt
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        if (parts.length > 0) {
          // Logo with content: left-right layout
          elements.push(
            <div key="logo-header" className="flex flex-col items-start gap-3">
              <div className="shrink-0">
                <Avatar style={{ width: logoWidth, height: logoHeight }}>
                  <AvatarImage src={logoSrc} alt={logoAlt} />
                  <AvatarFallback>{fallbackText}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 space-y-2">
                {parts.map((part, index) => (
                  <MessagePart
                    key={`${message.id}-tool-${index}`}
                    part={part}
                    isStreaming={
                      isLastMessage &&
                      status === "streaming" &&
                      index === parts.length - 1
                    }
                  />
                ))}
              </div>
            </div>,
          );
        } else {
          // Logo only: standalone display
          elements.push(
            <div key="logo-only" className="flex justify-start">
              <Avatar className="size-12">
                <AvatarImage
                  src={logoSrc}
                  alt={logoAlt}
                  width={logoWidth}
                  height={logoHeight}
                />
                <AvatarFallback>{fallbackText}</AvatarFallback>
              </Avatar>
            </div>,
          );
        }
      } else {
        // Regular rendering without logo
        elements.push(
          ...parts.map((part, index) => (
            <MessagePart
              key={`${message.id}-tool-${index}`}
              part={part}
              isStreaming={
                isLastMessage &&
                status === "streaming" &&
                index === parts.length - 1
              }
            />
          )),
        );
      }

      return elements;
    },
    [status, logoSrc, logoAlt, logoWidth, logoHeight],
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
          <div className="w-full">
            <Sources>
              <SourcesTrigger count={sourceParts.length} />
              <SourcesContent>
                {sourceParts.map((part, index) => {
                  return (
                    <Source
                      key={`${message.id}-source-${index}`}
                      href={part.url}
                      title={part.title || part.url}
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

  if (message.role === "system") {
    return null;
  }

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
          "space-y-2": message.role === "assistant",
          "mb-2": message.role === "user",
          "text-base ltr:rounded-br-none! rtl:rounded-bl-none!":
            message.role === "user",
        })}
        variant={message.role === "assistant" ? "flat" : "contained"}
      >
        {message.role === "assistant"
          ? renderAssistantMessage(message, isLastMessage)
          : renderUserMessage(message)}
      </MessageContent>

      {message.role === "assistant" && ["ready", "error"].includes(status)
        ? renderAssistantActions(message)
        : null}
    </Message>
  );
}
