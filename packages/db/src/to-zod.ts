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

import type { FieldAttribute } from "@agentstart/types";
import { type ZodType, z } from "zod";

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
      if (field.type === "json") {
        const validator = field.validator?.output as ZodType | undefined;
        let jsonSchema: ZodType = validator ?? z.unknown();
        if (field?.required === false) {
          jsonSchema = jsonSchema.optional();
        }
        if (field?.returned === false) {
          return acc;
        }
        return {
          ...acc,
          [key]: jsonSchema,
        };
      }
      if (Array.isArray(field.type)) {
        return {
          ...acc,
          [key]: z.any(),
        };
      }
      let schema: ZodType;
      switch (field.type) {
        case "string":
          schema = z.string();
          break;
        case "number":
          schema = z.number();
          break;
        case "boolean":
          schema = z.boolean();
          break;
        case "date":
          schema = z.date();
          break;
        default:
          schema = z.any();
          break;
      }
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
