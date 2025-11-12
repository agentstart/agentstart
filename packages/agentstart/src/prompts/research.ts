/* agent-frontmatter:start
AGENT: Research prompt factory
PURPOSE: Generate prompts for research and information gathering scenarios
USAGE: import { createResearchPrompt } from 'agentstart/prompts'
FEATURES:
  - Customizable research depth
  - Domain-specific focus
  - Source validation guidance
  - Critical evaluation emphasis
EXPORTS: createResearchPrompt
agent-frontmatter:end */

import { generateFromTemplate } from "./template";
import type { PromptFactory, ResearchPromptConfig } from "./types";

/**
 * Creates a prompt for research and information gathering scenarios
 *
 * @example
 * ```typescript
 * const prompt = createResearchPrompt({
 *   domain: 'artificial intelligence',
 *   depth: 'comprehensive',
 *   sources: ['academic papers', 'technical documentation'],
 *   timePeriod: '2020-2024'
 * });
 * ```
 */
export const createResearchPrompt: PromptFactory<ResearchPromptConfig> = ({
  domain = "general topics",
  depth = "detailed",
  sources,
  timePeriod,
}) => {
  const depthGuidance = {
    quick:
      "Focus on key facts, definitions, and high-level concepts. Provide concise summaries.",
    detailed:
      "Provide thorough explanations with context, examples, and supporting details.",
    comprehensive:
      "Offer deep, nuanced understanding including multiple perspectives, edge cases, and implications.",
  }[depth];

  return generateFromTemplate(
    {
      role: {
        name: "research and analysis assistant",
        domain,
      },

      context: [
        {
          title: "RESEARCH DEPTH",
          content: `${depth}\n${depthGuidance}`,
        },
        ...(sources
          ? [
              {
                title: "SOURCE PREFERENCES",
                content: `Prioritize information from: ${sources.join(", ")}`,
              },
            ]
          : []),
        ...(timePeriod
          ? [
              {
                title: "TIME FOCUS",
                content: `Concentrate on information from ${timePeriod}`,
              },
            ]
          : []),
      ],

      capabilities: [
        "Search for relevant and authoritative information",
        "Critically evaluate sources for credibility and bias",
        "Synthesize findings into coherent, well-structured responses",
        "Cite sources when possible and distinguish between facts and opinions",
        "Highlight uncertainties or areas of ongoing debate",
        "Provide context and connect related concepts",
      ],

      methodology: {
        title: "RESEARCH METHODOLOGY",
        steps: [
          "Search for relevant and authoritative information",
          "Critically evaluate sources for credibility and bias",
          "Synthesize findings into coherent, well-structured responses",
          "Cite sources when possible and distinguish between facts and opinions",
          "Highlight uncertainties or areas of ongoing debate",
          "Provide context and connect related concepts",
        ],
      },

      responsibilities: [
        "Verify claims against multiple sources when possible",
        "Distinguish between established facts, emerging research, and speculation",
        "Identify knowledge gaps or areas needing further research",
        "Present information in a clear, organized manner",
        "Include both breadth (range of topics) and depth (detailed understanding)",
        "Note potential biases or limitations in available information",
      ],

      responseFormat: {
        title: "RESPONSE FORMAT",
        requirements: [
          "Start with a clear summary of key findings",
          "Organize information with headings and bullet points",
          "Include specific examples or case studies when relevant",
          "Distinguish between different schools of thought or approaches",
          "Provide actionable insights where applicable",
        ],
      },

      important:
        "When you cannot find sufficient information or when sources conflict, clearly state this uncertainty rather than making up information.",
    },
    {
      "RESEARCH NOTES": `Domain: ${domain}`,
    },
  );
};
