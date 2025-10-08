/* agent-frontmatter:start
AGENT: Chat input component
PURPOSE: Handles message input and chat settings
USAGE: <ChatInput onSubmit={handleSubmit} status={status} />
FEATURES:
  - Text input with auto-resize
  - Model selection dropdown
  - Web search toggle
  - Submit button with loading state
SEARCHABLE: chat input, prompt input, message composer
agent-frontmatter:end */

import type { ChatStatus, FileUIPart } from "ai";
import { GlobeIcon, PaperclipIcon, X } from "lucide-react";
import { useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatStore } from "@/stores/chat";
import { CHAT_MODELS } from "../constants";

interface ChatInputProps {
  onSubmit: ({
    text,
    files,
  }: {
    text: string;
    files: FileList | FileUIPart[];
  }) => void;
  onStop: () => void;
  status?: ChatStatus;
}

export function ChatInput({ onSubmit, onStop, status }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { model, webSearch, setModel, toggleWebSearch } = useChatStore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "submitted" || status === "streaming") {
      onStop();
    } else {
      if (input.trim()) {
        // Create a new FileList by DataTransfer
        const dataTransfer = new DataTransfer();
        for (const file of files) {
          const newFile = new File([file], file.name, {
            type: file.type,
          });
          dataTransfer.items.add(newFile);
        }

        onSubmit({ text: input, files: dataTransfer.files });
        setInput("");
        setFiles([]);

        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  return (
    <PromptInput onSubmit={handleSubmit} className="mt-4">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 pl-3">
          {files.map((file, index) => {
            const fileKey = `${file.name}-${file.lastModified}`;
            return (
              <div
                key={fileKey}
                className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <PaperclipIcon className="size-4" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <Button
                  onClick={() => handleRemoveFile(index)}
                  className="size-5 rounded-full"
                  size="icon"
                  variant="ghost"
                >
                  <X className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <PromptInputTextarea
        onChange={(e) => setInput(e.target.value)}
        value={input}
        placeholder="Type a message..."
      />
      <PromptInputToolbar className="p-2">
        <PromptInputTools>
          <PromptInputButton
            variant="ghost"
            title="Attach files"
            className="!rounded-xl"
            size="icon"
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <PaperclipIcon className="size-4" />
            </label>
          </PromptInputButton>
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
