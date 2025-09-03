// AGENT: Chat constants and configuration
// PURPOSE: Centralized configuration for chat models
// USAGE: Import models array in chat components
// SEARCHABLE: chat models, ai models configuration

export const CHAT_MODELS = [
  {
    name: "GPT 5",
    value: "openai/gpt-5",
  },
  {
    name: "Claude Sonnet 4",
    value: "anthropic/claude-sonnet-4",
  },
  {
    name: "DeepSeek V3.1",
    value: "deepseek/deepseek-chat-v3.1",
  },
] as const;

export type ChatModel = (typeof CHAT_MODELS)[number]["value"];