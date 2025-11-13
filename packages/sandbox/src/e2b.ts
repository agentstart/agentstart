/* agent-frontmatter:start
AGENT: E2B sandbox adapter export
PURPOSE: Export E2B cloud sandbox adapter
USAGE: import { e2bSandboxAdapter } from "@agentstart/sandbox/e2b"
EXPORTS: e2bSandboxAdapter, E2B sandbox implementations
FEATURES:
  - Cloud sandbox execution via E2B
  - Isolated execution environments
  - File system operations
  - Bash command execution
  - Git operations
SEARCHABLE: e2b sandbox, cloud sandbox, e2b adapter
agent-frontmatter:end */

export {
  Bash as E2BBash,
  E2BSandbox,
  FileSystem as E2BFileSystem,
  Git as E2BGit,
} from "./adapter/e2b";
export { e2bSandboxAdapter } from "./factory/e2b";
