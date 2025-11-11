/* agent-frontmatter:start
AGENT: Agent runtime tool helper
PURPOSE: Holds shared constants used across built-in agent tools.
USAGE: Import to access git author defaults and other shared tool configuration.
EXPORTS: DEFAULT_WORKING_DIRECTORY, DEFAULT_CONFIG
FEATURES:
  - Defines default git author metadata for sandbox commits
  - Centralizes reusable configuration for tool helpers
SEARCHABLE: packages, agentstart, src, sandbox, adapter, e2b, constants, git, tools
agent-frontmatter:end */

export const DEFAULT_WORKING_DIRECTORY = "/home/user/workspace";

export const DEFAULT_CONFIG = {
  timeout: 300000, // E2B sandbox timeout (5 minutes - increased for stability)
  ports: [3000],
  runtime: "node",
};
