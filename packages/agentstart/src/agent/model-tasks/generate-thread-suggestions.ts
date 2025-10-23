/* agent-frontmatter:start
AGENT: Suggestions generation task
PURPOSE: Generate contextual follow-up suggestions using the configured language model
USAGE: Call generateThreadSuggestions with conversation context to produce follow-up prompts
EXPORTS: generateThreadSuggestions
FEATURES:
  - Generates actionable next-step suggestions
  - Handles error scenarios with safe fallbacks
  - Uses structured output for consistent format
SEARCHABLE: generate suggestions, model task, follow-up prompts, thread suggestions
agent-frontmatter:end */

import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

interface GenerateThreadSuggestionsOptions {
  conversationContext: string;
  model: LanguageModel;
  limit?: number;
  instructions?: string;
}

const DEFAULT_LIMIT = 5;

const DEFAULT_GENERATE_SUGGESTIONS_PROMPT = (limit: number) =>
  `Generate ${limit} contextual follow-up suggestions based on what was JUST discussed.

Guidelines:
1. Analyze what the assistant just showed/discussed (data, analysis, insights)
2. Suggest logical NEXT STEPS that build on this specific response
3. Keep suggestions ultra-brief (2-3 words ideal, max 5 words)
4. Use action verbs ("Show", "Compare", "Analyze", "Check", "List", "Explore")
5. Make suggestions specific to the context, not generic
6. Focus on available capabilities that provide value

Good suggestions are:
- Specific to what was just discussed
- Actionable using available capabilities
- Brief and clear (2-3 words)
- Natural next steps, not repetitive`;

export async function generateThreadSuggestions({
  conversationContext,
  model,
  limit = DEFAULT_LIMIT,
  instructions,
}: GenerateThreadSuggestionsOptions): Promise<string[]> {
  if (!conversationContext) {
    return [];
  }

  const systemInstructions =
    instructions || DEFAULT_GENERATE_SUGGESTIONS_PROMPT(limit);

  try {
    // Define schema for structured output
    const suggestionsSchema = z.object({
      suggestions: z
        .array(z.string().max(40))
        .min(3)
        .max(limit)
        .describe(`Array of prompt suggestions (2-5 words each)`),
    });

    // Generate suggestions using structured output
    const { object } = await generateObject({
      model,
      system: systemInstructions,
      prompt: conversationContext,
      schema: suggestionsSchema,
      mode: "json",
    });

    return object.suggestions;
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return [];
  }
}
