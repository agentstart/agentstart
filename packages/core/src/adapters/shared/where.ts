/* agent-frontmatter:start
AGENT: Adapter query helpers
PURPOSE: Provide shared where/sort normalization utilities for adapters
USAGE: Import normalizeWhereInput when translating filters in adapters
EXPORTS: AdapterWhereCondition, AdapterWhereOperator, normalizeWhereInput, normalizeSortInput
FEATURES:
  - Normalizes heterogeneous where inputs
  - Guards against malformed connector/operator combinations
  - Provides consistent sort normalization
SEARCHABLE: adapter where, filter normalization, sort normalization
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/errors";

export type AdapterWhereOperator =
  | "eq"
  | "ne"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in"
  | "not_in"
  | "contains"
  | "starts_with"
  | "ends_with";

export interface AdapterWhereCondition {
  field: string;
  value: unknown;
  operator?: AdapterWhereOperator;
  connector?: "AND" | "OR";
}

export interface AdapterSort {
  field: string;
  direction?: "asc" | "desc";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAdapterWhereCondition(
  value: unknown,
): value is AdapterWhereCondition {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.field === "string" && "value" in value;
}

/**
 * Ensures the incoming where clause is a well-formed array of conditions.
 */
export function normalizeWhereInput(where: unknown): AdapterWhereCondition[] {
  if (!where) {
    return [];
  }

  if (!Array.isArray(where)) {
    throw new AgentStackError(
      "DB_ADAPTER_INVALID_WHERE",
      "Where clause must be an array of conditions.",
    );
  }

  return where.map((raw) => {
    if (!isAdapterWhereCondition(raw)) {
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_WHERE",
        "Each where entry must include field and value.",
      );
    }
    const { field, value, operator, connector } = raw;
    return {
      field,
      value,
      operator,
      connector,
    };
  });
}

/**
 * Normalises sort specification into a predictable direction (`asc`/`desc`).
 */
export function normalizeSortInput(
  sort: AdapterSort[] | undefined,
): AdapterSort[] {
  if (!sort?.length) {
    return [];
  }

  return sort.map(({ field, direction }) => ({
    field,
    direction: direction === "desc" ? "desc" : "asc",
  }));
}

/**
 * Guards operators that require an array payload (e.g. IN, NOT IN).
 */
export function ensureArrayValue(condition: AdapterWhereCondition): unknown[] {
  if (!Array.isArray(condition.value)) {
    throw new AgentStackError(
      "DB_ADAPTER_INVALID_WHERE",
      `Operator "${condition.operator ?? "eq"}" for field "${condition.field}" requires an array value.`,
    );
  }
  return condition.value;
}

/**
 * Splits a where clause into AND/OR buckets so adapters can combine
 * conditions according to their driver semantics.
 */
export function splitWhereConditions(conditions: AdapterWhereCondition[]): {
  andConditions: AdapterWhereCondition[];
  orConditions: AdapterWhereCondition[];
} {
  const andConditions: AdapterWhereCondition[] = [];
  const orConditions: AdapterWhereCondition[] = [];
  conditions.forEach((condition) => {
    if (condition.connector === "OR") {
      orConditions.push(condition);
    } else {
      andConditions.push(condition);
    }
  });
  return { andConditions, orConditions };
}
