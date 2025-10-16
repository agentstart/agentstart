/* agent-frontmatter:start
AGENT: Title generation task
PURPOSE: Produce thread titles and emojis using the configured language model
USAGE: Call generateTitle with the first user message to derive thread metadata
EXPORTS: generateTitle
FEATURES:
  - Enforces concise titles and emoji suggestions
  - Handles error scenarios with safe fallbacks
SEARCHABLE: generate title, model task, thread metadata
agent-frontmatter:end */

import { generateObject, type LanguageModel, type UIMessage } from "ai";
import { z } from "zod";

interface GenerateTitleOptions {
  messages: UIMessage[];
  model: LanguageModel;
}

const GENERATE_TITLE_PROMPT = `Write a short, precise title (max 5 words) and a single emoji character for this conversation. If the user prompts a url, title is "Clone <url>". Use an emoji that best describes the thread.`;

export async function generateTitle({
  messages,
  model,
}: GenerateTitleOptions): Promise<{ title: string; emoji?: string }> {
  const userMessage =
    messages[0]?.parts.find((part) => part.type === "text")?.text ?? "";

  if (!userMessage) {
    return { title: "New Thread", emoji: "💬" };
  }

  try {
    const result = await generateObject({
      model,
      temperature: 0,
      maxOutputTokens: 50,
      system: GENERATE_TITLE_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      schema: z.object({
        title: z.string(),
        emoji: z.string(),
      }),
    });

    return result.object;
  } catch (error) {
    console.error("Error generating title:", error);
    return {
      title: userMessage.slice(0, 20),
      emoji: "💬",
    };
  }
}
