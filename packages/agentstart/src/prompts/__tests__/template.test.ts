/* agent-frontmatter:start
AGENT: Template system unit tests
PURPOSE: Test generateFromTemplate and BasePromptTemplate functionality
USAGE: Run with vitest: pnpm vitest template.test.ts
FEATURES:
  - Tests 7-section structure enforcement
  - Validates XML formatting
  - Tests custom sections
  - Tests createBaseTemplate utility
SEARCHABLE: test, template, unit test, validation
agent-frontmatter:end */

import { describe, expect, it } from "vitest";
import {
  type BasePromptTemplate,
  createBaseTemplate,
  generateFromTemplate,
} from "../template";

describe("generateFromTemplate", () => {
  it("should generate basic template with all 7 sections", () => {
    const template: BasePromptTemplate = {
      role: { name: "test assistant" },
      capabilities: ["Test capability 1", "Test capability 2"],
      methodology: { title: "TEST APPROACH", steps: ["Step 1", "Step 2"] },
      responsibilities: ["Be accurate", "Be helpful"],
      responseFormat: { title: "FORMAT", requirements: ["Use markdown"] },
      important: "Always verify facts",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("You are a test assistant");
    expect(result).toContain("## YOUR CAPABILITIES");
    expect(result).toContain("<capabilities>");
    expect(result).toContain("- Test capability 1");
    expect(result).toContain("- Test capability 2");
    expect(result).toContain("</capabilities>");
  });

  it("should generate with domain specialization", () => {
    const template: BasePromptTemplate = {
      role: { name: "expert", domain: "TypeScript" },
      capabilities: ["Write code"],
      methodology: { title: "WORKFLOW", steps: ["Analyze", "Code"] },
      responsibilities: ["Follow best practices"],
      responseFormat: { title: "FORMAT", requirements: ["Be clear"] },
      important: "Check your work",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("You are a expert specializing in TypeScript");
  });

  it("should include context sections when provided", () => {
    const template: BasePromptTemplate = {
      role: { name: "test assistant" },
      context: [
        { title: "ENVIRONMENT", content: "- Node.js 20" },
        { title: "PROJECT", content: "Building a web app" },
      ],
      capabilities: ["Test"],
      methodology: { title: "WORKFLOW", steps: ["Step 1"] },
      responsibilities: ["Test"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Test",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("## ENVIRONMENT");
    expect(result).toContain("- Node.js 20");
    expect(result).toContain("## PROJECT");
    expect(result).toContain("Building a web app");
  });

  it("should use methodology description when steps not provided", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: ["Test"],
      methodology: { title: "APPROACH", description: "Use agile methods" },
      responsibilities: ["Test"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Test",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("## APPROACH");
    expect(result).toContain("Use agile methods");
    expect(result).not.toContain("<steps>");
  });

  it("should format methodology with numbered steps in XML", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: ["Test"],
      methodology: {
        title: "WORKFLOW",
        steps: ["First step", "Second step", "Third step"],
      },
      responsibilities: ["Test"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Test",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("## WORKFLOW");
    expect(result).toContain("<steps>");
    expect(result).toContain("1. First step");
    expect(result).toContain("2. Second step");
    expect(result).toContain("3. Third step");
    expect(result).toContain("</steps>");
  });

  it("should format responsibilities in XML", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: ["Test"],
      methodology: { title: "WORKFLOW", steps: ["Test"] },
      responsibilities: ["Be accurate", "Be helpful", "Follow best practices"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Test",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("## RESPONSIBILITIES");
    expect(result).toContain("<responsibilities>");
    expect(result).toContain("- Be accurate");
    expect(result).toContain("- Be helpful");
    expect(result).toContain("- Follow best practices");
    expect(result).toContain("</responsibilities>");
  });

  it("should format response format in XML", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: ["Test"],
      methodology: { title: "WORKFLOW", steps: ["Test"] },
      responsibilities: ["Test"],
      responseFormat: {
        title: "FORMAT",
        requirements: ["Use markdown", "Be concise", "Include examples"],
      },
      important: "Test",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("## FORMAT");
    expect(result).toContain("<format>");
    expect(result).toContain("- Use markdown");
    expect(result).toContain("- Be concise");
    expect(result).toContain("- Include examples");
    expect(result).toContain("</format>");
  });

  it("should include important reminder at the end", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: ["Test"],
      methodology: { title: "WORKFLOW", steps: ["Test"] },
      responsibilities: ["Test"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Always verify your work",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("## IMPORTANT");
    expect(result).toContain("Always verify your work");
    expect(result.indexOf("IMPORTANT")).toBeGreaterThan(0);
  });

  it("should include custom sections", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: ["Test"],
      methodology: { title: "WORKFLOW", steps: ["Test"] },
      responsibilities: ["Test"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Test",
    };

    const customSections = {
      "PROJECT CONTEXT": "Building a todo app",
      "TEAM INFO": "5 developers, 1 PM",
    };

    const result = generateFromTemplate(template, customSections);

    expect(result).toContain("## PROJECT CONTEXT");
    expect(result).toContain("Building a todo app");
    expect(result).toContain("## TEAM INFO");
    expect(result).toContain("5 developers, 1 PM");
  });

  it("should handle empty arrays gracefully", () => {
    const template: BasePromptTemplate = {
      role: { name: "assistant" },
      capabilities: [],
      methodology: { title: "WORKFLOW", steps: [] },
      responsibilities: [],
      responseFormat: { title: "FORMAT", requirements: [] },
      important: "Test",
    };

    const result = generateFromTemplate(template);

    expect(result).toContain("You are a assistant.");
    expect(result).toContain("## IMPORTANT");
    expect(result).toContain("Test");
    // Empty arrays should not generate XML sections
    expect(result).not.toContain("<capabilities>");
    expect(result).not.toContain("<steps>");
    expect(result).not.toContain("<responsibilities>");
    expect(result).not.toContain("<format>");
  });
});

describe("createBaseTemplate", () => {
  it("should create template with defaults", () => {
    const template = createBaseTemplate();

    expect(template.role.name).toBe("assistant");
    expect(template.capabilities).toEqual([]);
    expect(template.methodology.title).toBe("APPROACH");
    expect(template.responsibilities).toEqual([]);
    expect(template.responseFormat.title).toBe("FORMAT");
    expect(template.important).toBe(
      "Always provide accurate and helpful information.",
    );
  });

  it("should override defaults with provided values", () => {
    const template = createBaseTemplate({
      role: { name: "expert" },
      capabilities: ["Special skill"],
      important: "Custom important message",
    });

    expect(template.role.name).toBe("expert");
    expect(template.capabilities).toEqual(["Special skill"]);
    expect(template.important).toBe("Custom important message");
    expect(template.methodology.title).toBe("APPROACH"); // Not overridden
  });

  it("should merge context when provided", () => {
    const template = createBaseTemplate({
      context: [{ title: "TEAM", content: "5 developers" }],
    });

    expect(template.context).toEqual([
      { title: "TEAM", content: "5 developers" },
    ]);
  });

  it("should be usable with generateFromTemplate", () => {
    const base = createBaseTemplate({
      capabilities: ["Base capability"],
    });

    const finalTemplate: BasePromptTemplate = {
      ...base,
      role: { name: "test assistant" },
      methodology: { title: "WORKFLOW", steps: ["Test"] },
      responsibilities: ["Test"],
      responseFormat: { title: "FORMAT", requirements: ["Test"] },
      important: "Test",
    };

    const result = generateFromTemplate(finalTemplate);

    expect(result).toContain("You are a test assistant");
    expect(result).toContain("- Base capability");
  });
});
