/* agent-frontmatter:start
AGENT: Sandbox adapter exports
PURPOSE: Surface sandbox adapter implementations through a single entry point
USAGE: import { Sandbox } from "agentstart/sandbox/adapter"
EXPORTS: E2B Sandbox, Node.js Sandbox
FEATURES:
  - Re-exports provider-specific sandbox adapters
  - Keeps consumer import paths consistent across providers
SEARCHABLE: sandbox adapter exports, e2b sandbox adapter, nodejs sandbox adapter
agent-frontmatter:end */

export {
  Bash as E2BBash,
  E2BSandbox,
  FileSystem as E2BFileSystem,
  Git as E2BGit,
} from "./e2b";
export {
  Bash as NodeBash,
  FileSystem as NodeFileSystem,
  Git as NodeGit,
  NodeSandbox,
} from "./nodejs";
