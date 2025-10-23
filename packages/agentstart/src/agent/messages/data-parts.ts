/* agent-frontmatter:start
AGENT: Custom data part schemas
PURPOSE: Define custom data parts that can be sent through message streams
USAGE: Import dataPartSchema and AgentStartDataPart for type-safe custom data
EXPORTS: dataPartSchema, AgentStartDataPart
FEATURES:
  - Zod schema for title update events
  - Type inference for custom data parts
SEARCHABLE: data parts, custom events, title update, stream data
agent-frontmatter:end */

import z from "zod";

export const dataPartSchema = z.object({
  "agentstart-title_update": z.object({
    title: z.string(),
  }),
  "agentstart-suggestions": z.object({
    prompts: z.array(z.string()),
  }),
});

export type AgentStartDataPart = z.infer<typeof dataPartSchema>;
