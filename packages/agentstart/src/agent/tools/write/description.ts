/* agent-frontmatter:start
AGENT: Agent runtime tool metadata
PURPOSE: Provides prompt guidance and guardrails for the Write tool.
USAGE: Referenced by the "write" tool definition to describe expected behavior.
EXPORTS: default
FEATURES:
  - Summarizes capabilities, inputs, and cautions for Write
  - Feeds documentation into adapter surfaces when exposing the tool
SEARCHABLE: packages, agentstart, src, agent, tools, write, description, tool, runtime
agent-frontmatter:end */

export default `Writes a file to the filesystem.

Usage:

- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.
`;
