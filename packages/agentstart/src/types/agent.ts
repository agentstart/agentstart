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

import type { UIMessage } from "ai";

type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<
  infer METADATA
>
  ? METADATA
  : Record<string, unknown>;
export type UIMessageMetadata = InferUIMessageMetadata<
  UIMessage<Record<string, unknown>>
>;
