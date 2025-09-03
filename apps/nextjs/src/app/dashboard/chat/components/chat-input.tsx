// AGENT: Chat input component
// PURPOSE: Handles message input and chat settings
// USAGE: <ChatInput onSubmit={handleSubmit} status={status} />
// FEATURES:
//   - Text input with auto-resize
//   - Model selection dropdown
//   - Web search toggle
//   - Submit button with loading state
// SEARCHABLE: chat input, prompt input, message composer

import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon } from "lucide-react";
import { useChatStore } from "@/stores/chat";
import { CHAT_MODELS } from "../constants";
import { useState } from "react";
import type { ChatStatus } from "ai";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  onStop: () => void;
  status?: ChatStatus;
}

export function ChatInput({ onSubmit, onStop, status }: ChatInputProps) {
  const [input, setInput] = useState("");
  const { model, webSearch, setModel, toggleWebSearch } = useChatStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "submitted" || status === "streaming") {
      onStop();
    } else {
      if (input.trim()) {
        onSubmit(input);
        setInput("");
      }
    }
  };

  return (
    <PromptInput onSubmit={handleSubmit} className="mt-4">
      <PromptInputTextarea
        onChange={(e) => setInput(e.target.value)}
        value={input}
        placeholder="Type a message..."
      />
      <PromptInputToolbar className="p-2">
        <PromptInputTools>
          <Tooltip>
            <TooltipTrigger asChild>
              <PromptInputButton
                variant={webSearch ? "default" : "ghost"}
                onClick={toggleWebSearch}
                title="Toggle web search"
                className="!rounded-xl"
                size="icon"
              >
                <GlobeIcon className="size-4" />
              </PromptInputButton>
            </TooltipTrigger>
            <TooltipContent>
              <span>Web Search</span>
            </TooltipContent>
          </Tooltip>
          <PromptInputModelSelect onValueChange={setModel} value={model}>
            <PromptInputModelSelectTrigger className="!h-8 rounded-xl">
              <PromptInputModelSelectValue />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              {CHAT_MODELS.map((model) => (
                <PromptInputModelSelectItem
                  key={model.value}
                  value={model.value}
                >
                  {model.name}
                </PromptInputModelSelectItem>
              ))}
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={
            status === "submitted" || (status === "ready" && !input.trim())
          }
          status={status}
          className="size-8 rounded-xl"
        />
      </PromptInputToolbar>
    </PromptInput>
  );
}
