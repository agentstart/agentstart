/* agent-frontmatter:start
AGENT: Analysis prompt factory
PURPOSE: Generate prompts for data analysis and visualization scenarios
USAGE: import { createAnalysisPrompt } from 'agentstart/prompts'
FEATURES:
  - Data type customization
  - Goal-oriented analysis
  - Output format specification
  - Statistical methodology selection
EXPORTS: createAnalysisPrompt
agent-frontmatter:end */

import type { BasePromptTemplate } from "./template";
import { generateFromTemplate } from "./template";
import type { AnalysisPromptConfig, PromptFactory } from "./types";

/**
 * Creates a prompt for data analysis scenarios
 *
 * @example
 * ```typescript
 * const prompt = createAnalysisPrompt({
 *   dataType: 'CSV sales data with date, product, and revenue columns',
 *   goals: ['identify trends', 'find anomalies', 'forecast revenue'],
 *   outputFormat: 'detailed report with visualizations',
 *   methods: ['time series analysis', 'statistical testing']
 * });
 * ```
 */
export const createAnalysisPrompt: PromptFactory<AnalysisPromptConfig> = ({
  dataType,
  goals,
  outputFormat,
  methods,
}) => {
  const customSections: Record<string, string> = {};

  if (goals && goals.length > 0) {
    customSections["ANALYSIS OBJECTIVES"] =
      `The primary goals are to: ${goals.join(", ")}`;
  }

  if (outputFormat) {
    customSections["DELIVERABLE FORMAT"] = `Produce output as: ${outputFormat}`;
  }

  if (methods) {
    customSections["ANALYTICAL APPROACH"] =
      `Use these methods where appropriate: ${methods.join(", ")}`;
  }

  const template: BasePromptTemplate = {
    role: {
      name: "data analysis assistant",
      domain: dataType
        ? `extracting insights from ${dataType}`
        : "various types of data",
    },
    capabilities: [
      "Handle data responsibly and note any quality issues",
      "Explain methodology in accessible terms",
      "Distinguish between correlation and causation",
      "Flag statistically significant findings",
      "Provide practical, actionable insights",
      "Include limitations and caveats",
    ],
    methodology: {
      title: "ANALYSIS WORKFLOW",
      steps: [
        "Examine the data structure and quality",
        "Clean and preprocess as needed (note any assumptions)",
        "Explore distributions and relationships",
        "Apply appropriate statistical methods",
        "Identify significant patterns and insights",
        "Validate findings and check for anomalies",
        "Clearly communicate results",
      ],
    },
    responsibilities: [
      "Be precise with statistical claims",
      "Avoid overfitting or seeing unsupported patterns",
      "Always note assumptions made during analysis",
    ],
    responseFormat: {
      title: "RESPONSE STRUCTURE",
      requirements: [
        "Executive summary of key findings",
        "Methodology overview",
        "Detailed analysis with supporting evidence",
        "Visualizations or descriptive representations",
        "Conclusions and recommendations",
        "Limitations and next steps",
      ],
    },
    important:
      "Be precise with statistical claims, avoid overfitting or seeing patterns that aren't well-supported, and always note assumptions made during analysis.",
  };

  return generateFromTemplate(template, customSections);
};
