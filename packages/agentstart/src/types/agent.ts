/* agent-frontmatter:start
AGENT: Agent interface definition
PURPOSE: Provide a structural contract for Agent implementations without runtime coupling
USAGE: import type { Agent } from "agentstart"
EXPORTS: Agent, AgentStreamOptions
FEATURES:
  - Captures the minimal streaming API the runtime expects
  - Enables packages to type Agent dependencies without importing implementations
SEARCHABLE: agent interface, agent stream options, shared agent types
agent-frontmatter:end */

import type {
  Experimental_AgentSettings as AISDK_AgentSettings,
  InferUIMessageChunk,
  ToolSet,
  UIMessage,
  UIMessageStreamOnFinishCallback,
} from "ai";
import type { SandboxAPI } from "@/sandbox";
import type { Adapter } from "./adapter";

export interface AgentStreamOptions {
  adapter: Adapter;
  sandbox: SandboxAPI;
  message: UIMessage;
  threadId: string;
  onFinish?: UIMessageStreamOnFinishCallback<UIMessage>;
  onError?: (error: unknown) => string;
}

export interface Agent<Context = unknown> {
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  messageMetadata?: (options: { part: unknown }) => unknown;
  settings: AISDK_AgentSettings<ToolSet>;
  stream(
    options: AgentStreamOptions,
  ): Promise<ReadableStream<InferUIMessageChunk<UIMessage>>>;
}
