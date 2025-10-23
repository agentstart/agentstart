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
import type { AgentStartUIMessage } from "./messages";

export interface BaseContext {
  threadId: string;
  writer: UIMessageStreamWriter<AgentStartUIMessage>;
  sandbox: SandboxAPI;
  db: Adapter;
}
