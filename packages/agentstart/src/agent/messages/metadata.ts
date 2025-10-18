/* agent-frontmatter:start
AGENT: Message metadata schemas
PURPOSE: Define metadata schemas for agent messages
USAGE: Import metadataSchema and AgentStartMetadata for message metadata typing
EXPORTS: metadataSchema, AgentStartMetadata
FEATURES:
  - Zod schema for message metadata
  - Includes sandbox ID, timestamps, model info, token counts, finish reasons
SEARCHABLE: metadata schema, message metadata, sandbox metadata
agent-frontmatter:end */

import z from "zod";

export const metadataSchema = z.object({
  sandboxId: z.string().optional(),
  createdAt: z.number().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
  finishReason: z
    .enum([
      "stop",
      "length",
      "content-filter",
      "tool-calls",
      "error",
      "other",
      "unknown",
    ])
    .optional(),
});

export type AgentStartMetadata = z.infer<typeof metadataSchema>;
