/* agent-frontmatter:start
AGENT: Agent runtime tool helper
PURPOSE: Holds shared constants used across built-in agent tools.
USAGE: Import to access git author defaults and other shared tool configuration.
EXPORTS: GIT_CONFIG
FEATURES:
  - Defines default git author metadata for sandbox commits
  - Centralizes reusable configuration for tool helpers
SEARCHABLE: packages, agentstart, src, agent, tools, constants, git
agent-frontmatter:end */

/**
 * Git configuration
 */
export const GIT_CONFIG = {
  /**
   * Default git author for commits
   */
  AUTHOR: {
    name: "agentstart-bot",
    email: "bot@agentstart.dev",
  },
} as const;
