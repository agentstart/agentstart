/* agent-frontmatter:start
AGENT: Adapter field helpers
PURPOSE: Describe and transform table field metadata for adapters
USAGE: import { FieldAttribute } from "agentstart/db/field"
EXPORTS: FieldAttribute, createFieldAttribute, InferFieldsInput, InferFieldsOutput
FEATURES:
  - Models field configuration used by schema generation
  - Offers helpers to infer TypeScript types from field definitions
SEARCHABLE: adapter field, schema field attribute, infer fields
agent-frontmatter:end */
/** biome-ignore-all lint/suspicious/noExplicitAny: is fine */

import type { FieldAttribute, FieldAttributeConfig, FieldType } from "@/types";

export type {
  FieldAttribute,
  FieldAttributeConfig,
  FieldType,
  InferFieldsFromOptions,
  InferFieldsFromPlugins,
  InferFieldsInput,
  InferFieldsInputClient,
  InferFieldsOutput,
  InferValueType,
  PluginFieldAttribute,
} from "@/types";

export const createFieldAttribute = <
  T extends FieldType,
  C extends Omit<FieldAttributeConfig<T>, "type">,
>(
  type: T,
  config?: C,
) => {
  return {
    type,
    ...config,
  } satisfies FieldAttribute<T>;
};
