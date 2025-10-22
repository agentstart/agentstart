/* agent-frontmatter:start
AGENT: Agent runtime tool metadata
PURPOSE: Provides prompt guidance and guardrails for the Glob tool.
USAGE: Referenced by the "glob" tool definition to describe expected behavior.
EXPORTS: default
FEATURES:
  - Summarizes capabilities, inputs, and cautions for Glob
  - Feeds documentation into adapter surfaces when exposing the tool
SEARCHABLE: packages, agentstart, src, agent, tools, glob, description, tool, runtime
agent-frontmatter:end */

export default `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.
`;
