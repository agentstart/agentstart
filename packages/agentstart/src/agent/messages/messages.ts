/* agent-frontmatter:start
AGENT: AgentStart message type definition
PURPOSE: Define the primary message type used throughout the agent system
USAGE: Import AgentStartUIMessage as the standard message type
EXPORTS: AgentStartUIMessage
FEATURES:
  - Combines metadata, data parts, and tool set into unified message type
  - Based on AI SDK UIMessage with custom extensions
SEARCHABLE: message type, ui message, agent message
agent-frontmatter:end */

import type { UIMessage } from "ai";

import type { AgentStartDataPart } from "./data-parts";
import type { AgentStartMetadata } from "./metadata";
import type { AgentStartToolSet } from "./tool";

export type AgentStartUIMessage = UIMessage<
  AgentStartMetadata,
  AgentStartDataPart,
  AgentStartToolSet
>;
