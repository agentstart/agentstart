/* agent-frontmatter:start
AGENT: Utility module
PURPOSE: Defines the AgentStartError class with rich metadata support.
USAGE: Throw when surfacing user-facing errors with codes and prompts.
EXPORTS: AgentStartError
FEATURES:
  - Carries status codes and remediation hints alongside errors
  - Provides consistent error naming across packages
SEARCHABLE: packages, utils, src, error, agentstarterror
agent-frontmatter:end */

export class AgentStartError extends Error {
  constructor(
    public code: string,
    message: string,
    public fix?: string,
    public prompt?: string,
    public statusCode = 500,
  ) {
    super(message);
    this.name = "AgentStartError";
  }
}
