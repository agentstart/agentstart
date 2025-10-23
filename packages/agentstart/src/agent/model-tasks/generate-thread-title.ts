/* agent-frontmatter:start
AGENT: Title generation task
PURPOSE: Produce thread titles and emojis using the configured language model
USAGE: Call generateThreadTitle with the first user message to derive thread metadata
EXPORTS: generateThreadTitle
FEATURES:
  - Enforces concise titles suggestions
  - Handles error scenarios with safe fallbacks
SEARCHABLE: generate title, model task, thread metadata
agent-frontmatter:end */

import { generateText, type LanguageModel, type UIMessage } from "ai";

interface GenerateTitleOptions {
  messages: UIMessage[];
  model: LanguageModel;
  instructions?: string;
}

const DEFAULT_GENERATE_TITLE_PROMPT = `Write a short, precise title (max 5 words) for this conversation.`;

export async function generateThreadTitle({
  messages,
  model,
  instructions = DEFAULT_GENERATE_TITLE_PROMPT,
}: GenerateTitleOptions) {
  const userMessage =
    messages[0]?.parts.find((part) => part.type === "text")?.text ?? "";

  if (!userMessage) {
    return "New Thread";
  }

  try {
    const result = await generateText({
      model,
      temperature: 0,
      maxOutputTokens: 50,
      system: instructions,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    return result.text;
  } catch (error) {
    console.error("Error generating title:", error);
    return userMessage.slice(0, 20);
  }
}
