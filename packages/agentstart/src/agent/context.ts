/* agent-frontmatter:start
AGENT: Base context types
PURPOSE: Define shared context interfaces passed to agent workflows
USAGE: Import BaseContext when constructing agent execution environments
EXPORTS: BaseContext
FEATURES:
  - Declares the writer interface for streaming responses
SEARCHABLE: agent context, base context, writer interface
agent-frontmatter:end */

import type { UIMessageStreamWriter } from "ai";
import type { SandboxAPI } from "@/sandbox";
import type { Adapter } from "@/types";

export interface BaseContext {
  threadId: string;
  writer: UIMessageStreamWriter;
  sandbox: SandboxAPI;
  db: Adapter;
}
