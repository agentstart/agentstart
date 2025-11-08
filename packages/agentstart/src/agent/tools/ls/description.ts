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

export default `Lists files and directories in a given path.

Usage notes:
- The path parameter must be an absolute path, not a relative path
- Use the 'recursive' parameter (default: false) to recursively list all subdirectories
- When recursive=true, returns a flat list with path, parentPath, isFile, and isDirectory for each entry
- Optionally provide an array of glob patterns to ignore with the ignore parameter
- Automatically ignores common build/cache directories (node_modules, .git, dist, etc.)
- For recursive listings, results are limited to 500 items; for non-recursive, 100 items
- You should generally prefer the Glob and Grep tools if you know which directories to search

Examples:
- List current directory: ls({ path: "/", recursive: false })
- Get entire file tree: ls({ path: "/", recursive: true })
- Ignore specific patterns: ls({ path: "/src", ignore: ["*.test.ts"] })
`;
