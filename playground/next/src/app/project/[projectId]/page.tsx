"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  client,
  useAgentStore,
  useChat,
  useChatStore,
} from "@/lib/agent-client";

export default function Page() {
  useChat();
  const { projectId } = useParams<{ projectId: string }>();
  const [input, setInput] = useState("");

  const messages = useAgentStore((state) => state.messages);
  const setMessages = useAgentStore((state) => state.setMessages);
  const sendMessage = useAgentStore((state) => state.sendMessage);
  const setProjectChats = useChatStore((state) => state.setProjectChats);
  const setChatActive = useChatStore((state) => state.setActiveChat);
  const activeChatId = useChatStore((state) => state.activeChatId);

  // Load initial messages
  useEffect(() => {
    if (!projectId) return;

    async function fetchActiveChatId() {
      const { chats, activeChatId } = await client.chat.getChats({ projectId });
      setProjectChats(projectId, chats);
      setChatActive(activeChatId ?? undefined);
    }
    async function init() {
      await fetchActiveChatId();
    }
    init();
  }, [projectId, setProjectChats, setChatActive]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    client.message.get({ chatId: activeChatId }).then((messages) => {
      setMessages(messages);
    });
  }, [activeChatId, setMessages]);

  return (
    <div className="stretch mx-auto flex w-full max-w-md flex-col py-24">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
              default:
                return null;
            }
          })}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(
            { text: input },
            {
              body: {
                chatId: activeChatId,
                projectId,
              },
            },
          );
          setInput("");
        }}
      >
        <input
          className="fixed bottom-0 mb-8 w-full max-w-md rounded border border-zinc-300 p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
