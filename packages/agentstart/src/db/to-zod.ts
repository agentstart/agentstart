/* agent-frontmatter:start
AGENT: Zod schema converter
PURPOSE: Transform field metadata into runtime Zod validation schemas
USAGE: const schema = toZodSchema(fields)
EXPORTS: toZodSchema
FEATURES:
  - Supports scalar fields, arrays, and optional values
  - Filters out non-returned fields from the generated schema
SEARCHABLE: zod converter, field metadata, schema validation
agent-frontmatter:end */

import { type ZodType, z } from "zod";
import type { FieldAttribute } from ".";

export function toZodSchema(fields: Record<string, FieldAttribute>) {
  const schema = z.object({
    ...Object.keys(fields).reduce((acc, key) => {
      const field = fields[key];
      if (!field) {
        return acc;
      }
      if (field.type === "string[]" || field.type === "number[]") {
        return {
          ...acc,
          [key]: z.array(field.type === "string[]" ? z.string() : z.number()),
        };
      }
      if (Array.isArray(field.type)) {
        return {
          ...acc,
          [key]: z.any(),
        };
      }
      let schema: ZodType = z[field.type]();
      if (field?.required === false) {
        schema = schema.optional();
      }
      if (field?.returned === false) {
        return acc;
      }
      return {
        ...acc,
        [key]: schema,
      };
    }, {}),
  });
  return schema;
}
