/* agent-frontmatter:start
AGENT: Adapter transform helpers
PURPOSE: Share input transformation utilities between adapters
USAGE: applyInputTransforms({ action: "create", ... })
EXPORTS: applyInputTransforms
FEATURES:
  - Applies default values from field metadata
  - Generates ids when allowed and missing
  - Skips undefined updates to preserve partial mutations
SEARCHABLE: adapter transforms, input normalization, default values
agent-frontmatter:end */

export interface InputTransformOptions {
  action: "create" | "update";
  model: string;
  data: Record<string, unknown>;
  allowId?: boolean;
  generateId?: () => unknown;
  getFieldAttributes: (model: string, field: string) => Record<string, unknown>;
}

/**
 * Normalises incoming write payloads so adapters can share default value and id
 * generation logic. The original object is not mutated.
 */
export function applyInputTransforms({
  action,
  model,
  data,
  allowId = true,
  generateId,
  getFieldAttributes,
}: InputTransformOptions): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };

  if (
    action === "create" &&
    allowId !== false &&
    generateId &&
    result.id === undefined
  ) {
    result.id = generateId();
  }

  const fields = new Set(Object.keys(result));
  if (action === "create") {
    // Ensure we inspect fields that might only have defaults.
    const schemaFields = Object.keys(
      getFieldAttributes(model, "__fields__") ?? {},
    );
    schemaFields.forEach((field) => {
      if (!fields.has(field)) {
        fields.add(field);
      }
    });
  }

  for (const field of fields) {
    const currentValue = result[field];
    if (currentValue !== undefined) {
      continue;
    }
    if (action === "update") {
      delete result[field];
      continue;
    }

    const attributes = getFieldAttributes(model, field);
    const defaultValue = attributes?.defaultValue;
    if (defaultValue === undefined) {
      continue;
    }
    result[field] =
      typeof defaultValue === "function" ? defaultValue() : defaultValue;
  }

  return result;
}
