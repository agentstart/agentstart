/* agent-frontmatter:start
AGENT: Agent runtime tool registry
PURPOSE: Aggregates built-in tool definitions exposed by the AgentStart runtime
USAGE: Import these exports when wiring tools in agent.ts
EXPORTS: Tools, AgentStartToolCall, AgentStartToolResult, agentTools, osTools, webTools
FEATURES:
  - Collects sandbox-aware tool implementations in a single map
  - Organizes tools by category (inner, os, web)
  - Provides typed tool call and result types
SEARCHABLE: tool registry, agent tools, inner tools, os tools
agent-frontmatter:end */

import type { TypedToolCall, TypedToolResult } from "ai";
import { bash } from "./bash";
import { edit } from "./edit";
import { glob } from "./glob";
import { grep } from "./grep";
import { ls } from "./ls";
import { read } from "./read";
import { todoRead } from "./todo-read";
import { todoWrite } from "./todo-write";
import { write } from "./write";

const tools = {
  bash,
  edit,
  glob,
  grep,
  ls,
  read,
  todoRead,
  todoWrite,
  write,
} as const;

export type Tools = typeof tools;
export type AgentStartToolCall = TypedToolCall<Tools>;
export type AgentStartToolResult = TypedToolResult<Tools>;

export const agentTools = {
  todoRead,
  todoWrite,
} as const;
export const osTools = {
  bash,
  edit,
  glob,
  grep,
  ls,
  read,
  write,
} as const;
export const webTools = {} as const;
