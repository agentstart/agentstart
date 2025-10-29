/* agent-frontmatter:start
AGENT: Agent runtime tool metadata
PURPOSE: Provides prompt guidance and guardrails for the Edit tool.
USAGE: Referenced by the "edit" tool definition to describe expected behavior.
EXPORTS: default
FEATURES:
  - Summarizes capabilities, inputs, and cautions for edit
  - Feeds documentation into adapter surfaces when exposing the tool
SEARCHABLE: packages, agentstart, src, agent, tools, edit, description, tool, runtime
agent-frontmatter:end */

export default `Performs exact string replacements in files.

Usage:

- You must use your \`Edit\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Edit tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the oldString or newString.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`oldString\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replaceAll\` to change every instance of \`oldString\`.
- Use \`replaceAll\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
`;
