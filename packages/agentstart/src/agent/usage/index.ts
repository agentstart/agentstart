/* agent-frontmatter:start
AGENT: Usage summary helpers
PURPOSE: Build serializable usage summaries from language model telemetry
USAGE: import { createUsageSummary, type AgentUsageSummary } from "agentstart/usage"
EXPORTS: createUsageSummary, AgentUsageSummary
FEATURES:
  - Normalizes LanguageModelUsage metrics
  - Derives context window caps via Tokenlens metadata
  - Provides reusable summaries for persistence and UI rendering
SEARCHABLE: usage summary, token usage, context tracking, tokenlens
agent-frontmatter:end */

import type { LanguageModelUsage } from "ai";
import { fetchModels as fetchTokenlensModels } from "tokenlens/fetch";
import { getUsage as getTokenlensUsage } from "tokenlens/helpers";

const DEFAULT_MAX_TOKENS = 1;

export interface AgentUsageSummary {
  modelId?: string;
  usage?: LanguageModelUsage;
  usedTokens: number;
  maxTokens: number;
  percentUsed?: number;
  generatedAt: string;
  context?: ReturnType<typeof getTokenlensUsage>["context"];
  costUSD?: ReturnType<typeof getTokenlensUsage>["costUSD"];
}

export interface CreateUsageSummaryOptions {
  modelId?: string;
  usage?: LanguageModelUsage | null;
  /**
   * Optional caller-supplied fallback when Tokenlens does not report limits.
   */
  fallbackMaxTokens?: number;
}

export async function createUsageSummary({
  modelId,
  usage,
  fallbackMaxTokens,
}: CreateUsageSummaryOptions): Promise<AgentUsageSummary | undefined> {
  const normalizedUsage = usage ?? undefined;
  if (!normalizedUsage || !modelId) {
    return undefined;
  }

  const TOKENLENS_CATALOG = await fetchTokenlensModels();

  const usedTokens = computeUsedTokens(normalizedUsage);

  const tokenlensPayload = buildTokenlensUsage(normalizedUsage);

  let tokenlensData: ReturnType<typeof getTokenlensUsage> | undefined;
  if (modelId) {
    try {
      tokenlensData = getTokenlensUsage({
        modelId,
        usage: tokenlensPayload,
        providers: TOKENLENS_CATALOG,
      });
    } catch {
      tokenlensData = undefined;
    }
  }

  const contextCaps = tokenlensData?.context;
  const maxCandidates = [
    contextCaps?.totalMax,
    fallbackMaxTokens,
    DEFAULT_MAX_TOKENS,
  ].filter((candidate): candidate is number => {
    return (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    );
  });

  const maxTokens =
    maxCandidates.length > 0 ? Math.max(...maxCandidates) : DEFAULT_MAX_TOKENS;

  const percentUsed =
    maxTokens > 0 ? Math.min(usedTokens / maxTokens, 1) : undefined;

  return {
    modelId,
    usage: normalizedUsage,
    usedTokens,
    maxTokens,
    percentUsed,
    generatedAt: new Date().toISOString(),
    context: contextCaps,
    costUSD: tokenlensData?.costUSD,
  };
}

function computeUsedTokens(usage?: LanguageModelUsage | null) {
  if (!usage) {
    return 0;
  }

  if (typeof usage.totalTokens === "number") {
    return usage.totalTokens;
  }

  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const reasoning = usage.reasoningTokens ?? 0;

  return input + output + reasoning;
}

function buildTokenlensUsage(usage?: LanguageModelUsage | null) {
  if (!usage) {
    return undefined;
  }

  const cacheWrites = usage.cachedInputTokens ?? 0;

  return {
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    reasoningTokens: usage.reasoningTokens ?? 0,
    cacheReads: usage.cachedInputTokens ?? 0,
    cacheWrites,
  };
}

function sumOptionalNumbers(
  left: number | null | undefined,
  right: number | null | undefined,
): number | undefined {
  const hasLeft = typeof left === "number";
  const hasRight = typeof right === "number";

  if (!hasLeft && !hasRight) {
    return undefined;
  }

  return (hasLeft ? left! : 0) + (hasRight ? right! : 0);
}

function mergeLanguageModelUsage(
  previous?: LanguageModelUsage,
  next?: LanguageModelUsage,
): LanguageModelUsage | undefined {
  if (!previous && !next) {
    return undefined;
  }

  if (!previous) {
    return next ? { ...next } : undefined;
  }

  if (!next) {
    return { ...previous };
  }

  const previousTotal =
    typeof previous.totalTokens === "number"
      ? previous.totalTokens
      : computeUsedTokens(previous);
  const nextTotal =
    typeof next.totalTokens === "number"
      ? next.totalTokens
      : computeUsedTokens(next);

  return {
    inputTokens: sumOptionalNumbers(previous.inputTokens, next.inputTokens),
    outputTokens: sumOptionalNumbers(previous.outputTokens, next.outputTokens),
    totalTokens: previousTotal + nextTotal,
    reasoningTokens: sumOptionalNumbers(
      previous.reasoningTokens,
      next.reasoningTokens,
    ),
    cachedInputTokens: sumOptionalNumbers(
      previous.cachedInputTokens,
      next.cachedInputTokens,
    ),
  };
}

const COST_KEYS = [
  "inputUSD",
  "outputUSD",
  "reasoningUSD",
  "cacheReadUSD",
  "cacheWriteUSD",
  "totalUSD",
] as const;

type TokenlensCost = ReturnType<typeof getTokenlensUsage>["costUSD"];

function mergeCostUSD(
  previous?: TokenlensCost,
  next?: TokenlensCost,
): TokenlensCost {
  if (!previous && !next) {
    return undefined;
  }

  if (!previous) {
    return next ? { ...next } : undefined;
  }

  if (!next) {
    return { ...previous };
  }

  const merged: NonNullable<TokenlensCost> = {};

  for (const key of COST_KEYS) {
    const value = sumOptionalNumbers(previous[key], next[key]);
    if (typeof value === "number") {
      merged[key] = value;
    }
  }

  return merged;
}

function resolveMaxTokens(candidate?: number) {
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }
  return DEFAULT_MAX_TOKENS;
}

export function mergeUsageSummaries(
  previous?: AgentUsageSummary | null,
  next?: AgentUsageSummary | null,
): AgentUsageSummary | undefined {
  if (!previous && !next) {
    return undefined;
  }

  if (!previous) {
    return next ?? undefined;
  }

  if (!next) {
    return previous ?? undefined;
  }

  const combinedUsage = mergeLanguageModelUsage(previous.usage, next.usage);

  const combinedUsedTokens =
    (previous.usedTokens ?? 0) + (next.usedTokens ?? 0);

  const maxTokens = Math.max(
    resolveMaxTokens(previous.maxTokens),
    resolveMaxTokens(next.maxTokens),
  );

  const percentUsed =
    maxTokens > 0 ? Math.min(combinedUsedTokens / maxTokens, 1) : undefined;

  return {
    ...next,
    modelId: next.modelId ?? previous.modelId,
    usage: combinedUsage,
    usedTokens: combinedUsedTokens,
    maxTokens,
    percentUsed,
    generatedAt: next.generatedAt ?? new Date().toISOString(),
    context: next.context ?? previous.context,
    costUSD: mergeCostUSD(previous.costUSD, next.costUSD),
  };
}
