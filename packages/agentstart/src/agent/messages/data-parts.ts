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
import type { AgentUsageSummary } from "@/agent/usage";

const usageSchema = z
  .object({
    modelId: z.string().optional(),
    usedTokens: z.number().nonnegative(),
    maxTokens: z.number().positive(),
    percentUsed: z.number().min(0).max(1).optional(),
    generatedAt: z.string().optional(),
    usage: z.any().optional(),
    context: z.any().optional(),
    costUSD: z.any().optional(),
  })
  .transform((value) => value as AgentUsageSummary);

export const dataPartSchema = z.object({
  "agentstart-title_update": z.object({
    title: z.string(),
  }),
  "agentstart-title_update_error": z.object({
    error: z.string(),
  }),
  "agentstart-suggestions": z.object({
    prompts: z.array(z.string()),
  }),
  "agentstart-suggestions_error": z.object({
    error: z.string(),
  }),
  "agentstart-usage": usageSchema,
  "agentstart-max_turns_reached": z.object({
    threadId: z.string(),
    maxTurns: z.number().int().positive(),
    usedTurns: z.number().int().nonnegative(),
    message: z.string().optional(),
  }),
});

export type AgentStartDataPart = z.infer<typeof dataPartSchema>;
