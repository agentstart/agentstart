/* agent-frontmatter:start
AGENT: Developer prompt factory
PURPOSE: Generate prompts for coding and software development scenarios
USAGE: import { createDeveloperPrompt } from 'agentstart/prompts'
FEATURES:
  - Customizable runtime environment
  - Project context injection
  - Framework-specific guidance
  - Best practices emphasis
EXPORTS: createDeveloperPrompt
agent-frontmatter:end */

import { generateFromTemplate } from "./template";
import type { CodingPromptConfig, PromptFactory } from "./types";

/**
 * Creates a prompt for coding and software development scenarios
 *
 * @example
 * ```typescript
 * const prompt = createDeveloperPrompt({
 *   runtime: 'Node.js 20',
 *   languages: ['TypeScript'],
 *   frameworks: ['Express', 'React'],
 *   projectContext: 'Building a REST API with React frontend'
 * });
 * ```
 */
export const createDeveloperPrompt: PromptFactory<CodingPromptConfig> = ({
  runtime = "Node.js 20",
  languages = ["JavaScript", "TypeScript"],
  projectContext,
  frameworks = [],
  customSections,
}) => {
  const frameworksText =
    frameworks.length > 0 ? frameworks.join(", ") : "General purpose";
  const languagesText = languages.join(", ");

  const defaultCustomSections = {
    ...(projectContext ? { "PROJECT CONTEXT": projectContext } : {}),
    "CODE QUALITY PRIORITIES":
      "1. Readability and maintainability\n2. Security best practices\n3. Performance and efficiency\n4. Proper error handling\n5. Clear documentation and comments",
  };

  const mergedCustomSections = {
    ...defaultCustomSections,
    ...(customSections || {}),
  };

  return generateFromTemplate(
    {
      role: {
        name: "expert software development assistant",
      },

      context: [
        {
          title: "ENVIRONMENT",
          content: `- Runtime: ${runtime}\n- Languages: ${languagesText}\n- Frameworks: ${frameworksText}`,
        },
      ],

      capabilities: [
        "Write clean, efficient, and well-documented code",
        "Explain complex technical concepts clearly",
        "Debug issues systematically with logical reasoning",
        "Suggest improvements and optimizations",
        "Follow language-specific best practices and conventions",
        "Consider security implications in all suggestions",
      ],

      methodology: {
        title: "WORKFLOW APPROACH",
        steps: [
          "First, seek to understand the requirements and constraints",
          "Plan the implementation before writing code",
          "Write or modify code with clear explanations",
          "Suggest ways to test and validate the solution",
          'Explain the "why" behind your recommendations',
        ],
      },

      responsibilities: [
        "Prioritize code readability and maintainability",
        "Follow security best practices",
        "Consider performance and efficiency",
        "Ensure proper error handling",
        "Provide clear documentation and comments",
      ],

      responseFormat: {
        title: "RESPONSE FORMAT",
        requirements: [
          "Use code blocks with language specifiers for all code",
          "Explain your reasoning before providing solutions",
          "Highlight potential trade-offs or alternatives",
          "Ask clarifying questions when requirements are ambiguous",
          "Provide practical, runnable examples when helpful",
        ],
      },

      important: `Always ensure your code follows the idiomatic patterns for ${languagesText} and respects the ${runtime} environment constraints.`,
    },
    mergedCustomSections,
  );
};
