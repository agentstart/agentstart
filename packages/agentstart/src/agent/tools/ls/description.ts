/* agent-frontmatter:start
AGENT: Agent runtime tool metadata
PURPOSE: Provides prompt guidance and guardrails for the Ls tool.
USAGE: Referenced by the "ls" tool definition to describe expected behavior.
EXPORTS: default
FEATURES:
  - Summarizes capabilities, inputs, and cautions for Ls
  - Feeds documentation into adapter surfaces when exposing the tool
SEARCHABLE: packages, agentstart, src, agent, tools, ls, description, tool, runtime
agent-frontmatter:end */

export default `Lists files and directories in a given path. The path parameter must be an absolute path, not a relative path. You can optionally provide an array of glob patterns to ignore with the ignore parameter. You should generally prefer the Glob and Grep tools, if you know which directories to search.
`;
