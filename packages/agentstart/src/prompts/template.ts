/* agent-frontmatter:start
AGENT: Base prompt template system
PURPOSE: Common template structure extracted from all scenario prompts for consistency
USAGE: Import and use generateFromTemplate() to create prompts with unified structure
FEATURES:
  - Enforces 7-section prompt structure
  - Type-safe template configuration
  - Custom section support
  - Reduces code duplication by ~30%
EXPORTS: BasePromptTemplate, generateFromTemplate
SEARCHABLE: template, base prompt, common structure, prompt factory
agent-frontmatter:end */

/**
 * Generic prompt factory type
 */
export type PromptFactory<Config = Record<string, never>> = (
  config: Config,
) => string;

/**
 * Base structure for all scenario prompts
 * Enforces consistency across all prompt factories
 */
export interface BasePromptTemplate {
  /** 1. Role definition - Who you are */
  role: {
    /** Role/persona description */
    name: string;
    /** Optional domain specialization */
    domain?: string;
  };

  /** 2. Context sections - Environment, constraints, configuration */
  context?: {
    /** Section title in uppercase */
    title: string;
    /** Multi-line content */
    content: string;
  }[];

  /** 3. Capabilities - What you can do */
  capabilities: string[];

  /** 4. Methodology - How you work */
  methodology: {
    /** Section title in uppercase */
    title: string;
    /** Numbered steps (optional) */
    steps?: string[];
    /** Or descriptive text (optional) */
    description?: string;
  };

  /** 5. Responsibilities - Your duties and priorities */
  responsibilities: string[];

  /** 6. Response format - How to structure output */
  responseFormat: {
    /** Section title in uppercase */
    title: string;
    /** Format requirements */
    requirements: string[];
  };

  /** 7. Important reminder - Core principles */
  important: string;
}

/**
 * Generates a prompt from a template with consistent structure
 *
 * @example
 * ```typescript
 * const template: BasePromptTemplate = {
 *   role: { name: "expert assistant" },
 *   capabilities: ["Analyze data", "Provide insights"],
 *   methodology: {
 *     title: "WORKFLOW",
 *     steps: ["Step 1", "Step 2"]
 *   },
 *   responsibilities: ["Be accurate"],
 *   responseFormat: {
 *     title: "FORMAT",
 *     requirements: ["Use markdown"]
 *   },
 *   important: "Always verify facts"
 * };
 *
 * const prompt = generateFromTemplate(template);
 * ```
 */
export function generateFromTemplate(
  template: BasePromptTemplate,
  customSections?: Record<string, string>,
): string {
  const sections: string[] = [];

  // 1. Role definition
  const roleText = template.role.domain
    ? `You are a ${template.role.name} specializing in ${template.role.domain}.`
    : `You are a ${template.role.name}.`;
  sections.push(roleText);

  // 2. Context sections (optional)
  if (template.context && template.context.length > 0) {
    template.context.forEach((ctx) => {
      sections.push(`\n## ${ctx.title}\n${ctx.content}`);
    });
  }

  // 3. Capabilities - Simplified XML format
  if (template.capabilities.length > 0) {
    sections.push(
      `\n## YOUR CAPABILITIES\n<capabilities>\n${template.capabilities
        .map((cap) => `- ${cap}`)
        .join("\n")}\n</capabilities>`,
    );
  }

  // 4. Methodology - Simplified XML format
  if (template.methodology.steps && template.methodology.steps.length > 0) {
    sections.push(
      `\n## ${template.methodology.title}\n<steps>\n${template.methodology.steps
        .map((step, i) => `${i + 1}. ${step}`)
        .join("\n")}\n</steps>`,
    );
  } else if (template.methodology.description) {
    sections.push(
      `\n## ${template.methodology.title}\n${template.methodology.description}`,
    );
  }

  // 5. Responsibilities - Simplified XML format
  if (template.responsibilities.length > 0) {
    sections.push(
      `\n## RESPONSIBILITIES\n<responsibilities>\n${template.responsibilities
        .map((resp) => `- ${resp}`)
        .join("\n")}\n</responsibilities>`,
    );
  }

  // 6. Response format - Simplified XML format
  if (template.responseFormat.requirements.length > 0) {
    sections.push(
      `\n## ${template.responseFormat.title}\n<format>\n${template.responseFormat.requirements
        .map((req) => `- ${req}`)
        .join("\n")}\n</format>`,
    );
  }

  // 7. Important reminder
  sections.push(`\n## IMPORTANT\n${template.important}`);

  // Add custom sections if provided
  if (customSections) {
    Object.entries(customSections).forEach(([title, content]) => {
      sections.push(`\n## ${title}\n${content}`);
    });
  }

  return sections.join("\n");
}

/**
 * Creates a partial template with common defaults
 * Useful for organizational branding
 *
 * @example
 * ```typescript
 * const companyTemplate = createBaseTemplate({
 *   capabilities: ["Follow company values", "Prioritize customers"],
 *   important: "Always represent our brand professionally"
 * });
 *
 * const developerPrompt = generateFromTemplate({
 *   ...companyTemplate,
 *   role: { name: "developer" },
 *   // ... other specific config
 * });
 * ```
 */
export function createBaseTemplate(
  overrides?: Partial<BasePromptTemplate>,
): BasePromptTemplate {
  return {
    role: { name: "assistant" },
    capabilities: [],
    methodology: { title: "APPROACH" },
    responsibilities: [],
    responseFormat: { title: "FORMAT", requirements: [] },
    important: "Always provide accurate and helpful information.",
    ...overrides,
  };
}
