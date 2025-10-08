/* agent-frontmatter:start
AGENT: Chat conversation component
PURPOSE: Displays the conversation history with messages
USAGE: <ChatConversation messages={messages} status={status} />
FEATURES:
  - Scrollable conversation area
  - Auto-scroll to bottom on new messages
  - Loading indicator for pending responses
SEARCHABLE: conversation display, message list, chat history
agent-frontmatter:end */

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import type { UIMessage, ChatStatus, AbstractChat } from "ai";
import { ChatMessage } from "./chat-message";

interface ChatConversationProps {
  messages: UIMessage[];
  status?: ChatStatus;
  onRegenerate?: AbstractChat<UIMessage>["regenerate"];
  onEdit?: (messageId: string, content: string) => void;
}

export function ChatConversation({
  messages,
  status,
  onRegenerate,
  onEdit,
}: ChatConversationProps) {
  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            status={status}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
          />
        ))}
        {status === "submitted" && (
          <div className="flex items-center gap-1.5">
            <Loader variant="pulse" size="sm" />
            <Loader variant="text-shimmer" text="Thinking and working..." />
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
