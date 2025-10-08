/* agent-frontmatter:start
AGENT: AI Chat interface with streaming responses
PURPOSE: Provides out-of-the-box chat functionality with AI
USAGE: Visit /dashboard/chat to interact with AI assistant
FEATURES:
  - Streaming responses with real-time updates
  - Markdown rendering with syntax highlighting
  - Message history with user/assistant roles
  - Loading states and error handling
SEARCHABLE: ai chat, streaming, markdown, chatbot
agent-frontmatter:end */

"use client";

import { ChatConversation, ChatInput } from "./components";
import { useChatStream } from "./hooks/use-chat-stream";

const ChatPage = () => {
  const { messages, sendMessage, regenerate, edit, status, stop } =
    useChatStream();

  return (
    <div className="relative mx-auto size-full h-screen max-w-4xl p-6">
      <div className="flex h-full flex-col">
        <ChatConversation
          messages={messages}
          status={status}
          onRegenerate={regenerate}
          onEdit={edit}
        />
        <ChatInput onSubmit={sendMessage} onStop={stop} status={status} />
      </div>
    </div>
  );
};

export default ChatPage;
