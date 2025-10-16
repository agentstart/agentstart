/* agent-frontmatter:start
AGENT: AgentStack message type definition
PURPOSE: Define the primary message type used throughout the agent system
USAGE: Import AgentStackUIMessage as the standard message type
EXPORTS: AgentStackUIMessage
FEATURES:
  - Combines metadata, data parts, and tool set into unified message type
  - Based on AI SDK UIMessage with custom extensions
SEARCHABLE: message type, ui message, agent message
agent-frontmatter:end */

import type { UIMessage } from "ai";

import type { AgentStackDataPart } from "./data-parts";
import type { AgentStackMetadata } from "./metadata";
import type { AgentStackToolSet } from "./tool";

export type AgentStackUIMessage = UIMessage<
  AgentStackMetadata,
  AgentStackDataPart,
  AgentStackToolSet
>;
