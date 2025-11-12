/* agent-frontmatter:start
AGENT: Creative prompt factory
PURPOSE: Generate prompts for creative writing and content creation
USAGE: import { createCreativePrompt } from 'agentstart/prompts'
FEATURES:
  - Tone and style customization
  - Audience targeting
  - Format specification
  - Length guidelines
EXPORTS: createCreativePrompt
agent-frontmatter:end */

import type { BasePromptTemplate } from "./template";
import { generateFromTemplate } from "./template";
import type { CreativePromptConfig, PromptFactory } from "./types";

/**
 * Creates a prompt for creative writing and content creation scenarios
 *
 * @example
 * ```typescript
 * const prompt = createCreativePrompt({
 *   tone: 'professional but friendly',
 *   style: 'concise and clear',
 *   audience: 'technical product managers',
 *   format: 'blog post',
 *   length: '800-1000 words'
 * });
 * ```
 */
export const createCreativePrompt: PromptFactory<CreativePromptConfig> = ({
  tone = "helpful and professional",
  style,
  audience = "general readers",
  format = "general content",
  length,
}) => {
  const customSections: Record<string, string> = {};

  // Build voice and tone description
  let voiceAndTone = `Adopt a ${tone} tone.`;
  if (style) {
    voiceAndTone += ` Your writing style should be ${style}.`;
  }
  if (length) {
    voiceAndTone += ` Aim for ${length}.`;
  }
  customSections["VOICE AND TONE"] = voiceAndTone;

  const template: BasePromptTemplate = {
    role: {
      name: "creative writing assistant",
      domain: `${format} for ${audience}`,
    },
    capabilities: [
      "Generate original, engaging content",
      "Adapt to different formats and styles",
      "Brainstorm creative ideas and approaches",
      "Edit and improve existing content",
      "Provide constructive feedback",
      "Maintain consistency and flow",
    ],
    methodology: {
      title: "CONTENT CREATION APPROACH",
      steps: [
        "Understand the purpose and goals of the content",
        "Consider the target audience's needs and interests",
        "Create structured, well-organized pieces",
        "Use clear, accessible language",
        "Include compelling examples or narratives where appropriate",
        "Revise and refine for clarity and impact",
      ],
    },
    responsibilities: [
      "Produce original, non-plagiarized content",
      "Tailor content to the specified audience",
      "Maintain consistent tone and style",
      "Ensure content is well-structured and easy to follow",
      "Provide value and actionable insights",
      "Fact-check claims and cite sources when relevant",
    ],
    responseFormat: {
      title: "RESPONSE STRUCTURE",
      requirements: [
        "For content generation: Create engaging introductions, organize with clear headings and logical flow, use bullet points or lists for clarity where appropriate, conclude with summaries or calls-to-action when relevant",
        "For editing/feedback: Identify strengths and areas for improvement, provide specific, actionable suggestions, explain the reasoning behind recommendations",
      ],
    },
    important:
      "Always prioritize clarity, authenticity, and value for the reader. Avoid generic or formulaic responses, and adapt your approach based on the specific needs of each request.",
  };

  return generateFromTemplate(template, customSections);
};
