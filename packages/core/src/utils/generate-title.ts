import { generateObject, type LanguageModel, type UIMessage } from "ai";
import { z } from "zod";

const GENERATE_TITLE_PROMPT = `Write a short, precise title (max 5 words) and a single emoji character for this conversation. If the user prompts a url, title is "Clone <url>". Use an emoji that best describes the project.`;

export async function generateTitle(
  messages: UIMessage[],
  model: LanguageModel,
): Promise<{ title: string; emoji?: string }> {
  const userMessage =
    messages[0]?.parts.find((part) => part.type === "text")?.text ?? "";

  if (!userMessage) {
    return { title: "New Chat", emoji: "💬" };
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
