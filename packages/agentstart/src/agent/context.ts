/* agent-frontmatter:start
AGENT: Base context types
PURPOSE: Define shared context interfaces passed to agent workflows
USAGE: Import RuntimeContext when constructing agent execution environments
EXPORTS: RuntimeContext
FEATURES:
  - Declares the writer interface for streaming responses
SEARCHABLE: agent context, base context, writer interface
agent-frontmatter:end */

import type { UIMessageStreamWriter } from "ai";
import type { SandboxAPI } from "@/sandbox";
import type { Adapter } from "@/types";
import type { AgentStartUIMessage } from "./messages";

export interface RuntimeContext {
  writer: UIMessageStreamWriter<AgentStartUIMessage>;
  threadId: string;
  sandbox: SandboxAPI;
  db: Adapter;
}
