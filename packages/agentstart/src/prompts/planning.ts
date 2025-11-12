/* agent-frontmatter:start
AGENT: Planning prompt factory
PURPOSE: Generate prompts for project planning and task management scenarios
USAGE: import { createPlanningPrompt } from 'agentstart/prompts'
FEATURES:
  - Project type customization
  - Timeline constraints
  - Team dynamics
  - Methodology support
EXPORTS: createPlanningPrompt
agent-frontmatter:end */

import type { BasePromptTemplate } from "./template";
import { generateFromTemplate } from "./template";
import type { PlanningPromptConfig, PromptFactory } from "./types";

/**
 * Creates a prompt for planning and project management scenarios
 *
 * @example
 * ```typescript
 * const prompt = createPlanningPrompt({
 *   projectType: 'SaaS application launch',
 *   timeline: '6 months',
 *   team: '5 developers, 2 designers, 1 PM',
 *   constraints: ['limited budget', 'API dependencies'],
 *   methodology: 'agile'
 * });
 * ```
 */
export const createPlanningPrompt: PromptFactory<PlanningPromptConfig> = ({
  projectType = "projects",
  timeline,
  team,
  constraints,
  methodology = "flexible",
}) => {
  const customSections: Record<string, string> = {};

  if (timeline) {
    customSections.TIMELINE = `Working within a ${timeline} timeframe.`;
  }

  if (team) {
    customSections["TEAM STRUCTURE"] = team;
  }

  if (constraints && constraints.length > 0) {
    customSections["CONSTRAINTS TO CONSIDER"] =
      `- ${constraints.join("\n- ")}\n\nThese constraints must factor into all planning and recommendations.`;
  }

  const template: BasePromptTemplate = {
    role: {
      name: "planning and project management assistant",
      domain: `${methodology} approaches to ${projectType}`,
    },
    capabilities: [
      "Break down complex projects into manageable tasks",
      "Identify dependencies and critical paths",
      "Estimate timelines and resource needs",
      "Suggest appropriate methodologies and workflows",
      "Create action plans with clear priorities",
      "Anticipate risks and mitigation strategies",
    ],
    methodology: {
      title: "PLANNING WORKFLOW",
      steps: [
        "Clarify goals, objectives, and success criteria",
        "Identify all major components and deliverables",
        "Map dependencies and sequences",
        "Estimate effort and timelines for each component",
        "Identify resource needs and constraints",
        "Develop risk management approaches",
        "Create actionable next steps",
      ],
    },
    responsibilities: [
      "Balance ambition with realism",
      "Consider both strategic goals and practical constraints",
      "Provide concrete, actionable recommendations",
      "Identify critical path items that impact overall timeline",
      "Suggest phase-based approaches when appropriate",
      "Highlight risks and assumptions clearly",
      "Adapt recommendations to team size, skills, and experience",
    ],
    responseFormat: {
      title: "RESPONSE STRUCTURE",
      requirements: [
        "Executive summary of the approach",
        "Detailed breakdown by phase or component",
        "Timeline estimates with dependencies",
        "Resource requirements",
        "Risk assessment and mitigation",
        "Immediate next steps with clear ownership",
        "Success metrics and checkpoints",
      ],
    },
    important:
      'Be practical and honest about tradeoffs. A realistic plan that gets executed is better than an ambitious plan that fails. Always include "confidence levels" on estimates and highlight assumptions.',
  };

  return generateFromTemplate(template, customSections);
};
