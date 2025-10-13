/* agent-frontmatter:start
AGENT: Custom data part schemas
PURPOSE: Define custom data parts that can be sent through message streams
USAGE: Import dataPartSchema and AgentStackDataPart for type-safe custom data
EXPORTS: dataPartSchema, AgentStackDataPart
FEATURES:
  - Zod schema for title update events
  - Type inference for custom data parts
SEARCHABLE: data parts, custom events, title update, stream data
agent-frontmatter:end */

import z from "zod";

export const dataPartSchema = z.object({
  "agent-stack-title_update": z.object({
    title: z.string(),
    emoji: z.string().optional(),
  }),
});

export type AgentStackDataPart = z.infer<typeof dataPartSchema>;
