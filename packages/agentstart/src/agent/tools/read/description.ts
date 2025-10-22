/* agent-frontmatter:start
AGENT: Agent runtime tool metadata
PURPOSE: Provides prompt guidance and guardrails for the Read tool.
USAGE: Referenced by the "read" tool definition to describe expected behavior.
EXPORTS: default
FEATURES:
  - Summarizes capabilities, inputs, and cautions for Read
  - Feeds documentation into adapter surfaces when exposing the tool
SEARCHABLE: packages, agentstart, src, agent, tools, read, description, tool, runtime
agent-frontmatter:end */

export default `Reads a file from the filesystem. You can access any file directly by using this tool.

Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:

- The filePath parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows Same++ to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Same++ is a multimodal LLM.
- This tool can read PDF files (.pdf). PDFs are processed page by page, extracting both text and visual content for analysis.
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
`;
