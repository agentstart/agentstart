/* agent-frontmatter:start
AGENT: Agent interface definition
PURPOSE: Provide a structural contract for Agent implementations without runtime coupling
USAGE: import type { Agent } from "@agent-stack/types"
EXPORTS: Agent, AgentStreamOptions
FEATURES:
  - Captures the minimal streaming API the runtime expects
  - Enables packages to type Agent dependencies without importing implementations
SEARCHABLE: agent interface, agent stream options, shared agent types
agent-frontmatter:end */

import type { Adapter } from "./adapter";

export interface AgentStreamOptions<
  Message = unknown,
  StreamResult = ReadableStream<unknown>,
> {
  adapter: Adapter;
  message: Message;
  threadId: string;
  onFinish?: ((result: StreamResult) => unknown) | undefined;
  onError?: ((error: unknown) => unknown) | undefined;
}

export interface Agent<
  Message = unknown,
  StreamResult = ReadableStream<unknown>,
> {
  stream(
    options: AgentStreamOptions<Message, StreamResult>,
  ): Promise<StreamResult>;
}
