"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  client,
  useAgentStore,
  useThread,
  useThreadStore,
} from "@/lib/agent-client";

export default function Page() {
  useThread();
  const { threadId } = useParams<{ threadId: string }>();
  const [input, setInput] = useState("");

  const messages = useAgentStore((state) => state.messages);
  const setMessages = useAgentStore((state) => state.setMessages);
  const sendMessage = useAgentStore((state) => state.sendMessage);
  const setThreads = useThreadStore((state) => state.setThreads);

  // Load initial threads
  useEffect(() => {
    async function fetchThreads() {
      const { threads } = await client.thread.list();
      setThreads(threads);
    }
    fetchThreads();
  }, [setThreads]);

  // Load messages for the current thread
  useEffect(() => {
    if (!threadId) {
      return;
    }

    client.message.get({ threadId }).then((messages) => {
      setMessages(messages);
    });
  }, [threadId, setMessages]);

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
                threadId,
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
