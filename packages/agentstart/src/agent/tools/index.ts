/* agent-frontmatter:start
AGENT: Agent runtime tool registry
PURPOSE: Aggregates built-in tool definitions exposed by the AgentStart runtime.
USAGE: Import these exports when wiring tools in agentstart.config.ts.
EXPORTS: Tools, innerTools, osTools, webTools
FEATURES:
  - Collects sandbox-aware tool implementations in a single map
  - Simplifies registration of built-in tools across environments
SEARCHABLE: packages, agentstart, src, agent, tools, index, tool, registry
agent-frontmatter:end */

import type { TypedToolCall, TypedToolResult } from "ai";
import { bash } from "./bash";
import { glob } from "./glob";
import { grep } from "./grep";
import { ls } from "./ls";
import { read } from "./read";
import { todoRead } from "./todo-read";
import { todoWrite } from "./todo-write";
import { update } from "./update";
import { write } from "./write";

const tools = {
  update,
  read,
  write,
  bash,
  glob,
  grep,
  ls,
  todoRead,
  todoWrite,
} as const;

export type Tools = typeof tools;
export type AgentStartToolCall = TypedToolCall<Tools>;
export type AgentStartToolResult = TypedToolResult<Tools>;

export const innerTools = {
  todoRead,
  todoWrite,
} as const;
export const osTools = {
  bash,
  glob,
  grep,
  ls,
  read,
  write,
  update,
} as const;
export const webTools = {} as const;
