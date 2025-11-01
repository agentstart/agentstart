/* agent-frontmatter:start
AGENT: SDK docs generator prototype
PURPOSE: Traverse oRPC router procedures and extract metadata for documentation
USAGE: bun run ./scripts/generate-sdk-docs.ts
EXPORTS:
  - default (script entry)
FEATURES:
  - Walks appRouter procedures using traverseContractProcedures
  - Logs procedure metadata for further processing
  - Serves as foundation for MDX doc generation
SEARCHABLE: sdk docs generator, traverseContractProcedures, doc tooling
agent-frontmatter:end */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { traverseContractProcedures } from "@orpc/server";
import { ensureDir, writeFile } from "fs-extra";
import type { ZodType } from "zod";
import * as z from "zod";
import { appRouter } from "../src/api/router";

interface ProcedureDoc {
  path: string[];
  method: string;
  meta?: unknown;
  inputSchema?: unknown;
  outputSchema?: unknown;
  inputTypeName?: string;
  outputTypeName?: string;
  docMeta?: DocMeta;
}

interface ParameterNode {
  name: string;
  description: string;
}

type TypeTableEntry = {
  type: string;
  description?: string;
  typeDescription?: string;
  typeDescriptionLink?: string;
  default?: string;
  required?: boolean;
  deprecated?: boolean;
  parameters?: ParameterNode[];
  returns?: string;
  properties?: TypeTableShape;
};

type TypeTableShape = Record<string, TypeTableEntry>;

interface DocMetaExample {
  title?: string;
  code: string;
}

interface DocMeta {
  summary?: string;
  description?: string;
  returnType?: string;
  examples?: DocMetaExample[];
}

type JSONSchema = Record<string, unknown> & {
  type?: string | string[];
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  enum?: unknown[];
  const?: unknown;
  description?: string;
  nullable?: boolean;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  anyOf?: unknown[];
  oneOf?: unknown[];
  allOf?: unknown[];
  additionalProperties?: unknown;
  default?: unknown;
  examples?: unknown[];
  deprecated?: boolean;
};

interface TypeInfo {
  short: string;
  detailed?: string;
  summary?: string;
}

// Script intended to be executed with Bun. Wrap in async IIFE so we can await future work easily.
await (async () => {
  const procedures: ProcedureDoc[] = [];

  traverseContractProcedures(
    { router: appRouter, path: [] },
    ({ contract, path }) => {
      if (!contract || typeof contract !== "object") {
        return;
      }

      const procedureRecord: ProcedureDoc = {
        path: path.slice(),
        method: path.join("."),
      };

      const orpcInternal = Reflect.get(contract as object, "~orpc") as
        | {
            inputSchema?: unknown;
            outputSchema?: unknown;
            meta?: unknown;
          }
        | undefined;

      if (orpcInternal?.meta) {
        procedureRecord.meta = orpcInternal.meta;
        const docMeta = extractDocMeta(orpcInternal.meta);
        if (docMeta) {
          procedureRecord.docMeta = docMeta;
        }
      }

      const inputSchema = orpcInternal?.inputSchema;
      if (isZodType(inputSchema)) {
        const normalized = unwrapZodSchema(inputSchema);
        procedureRecord.inputSchema = toJsonSchema(normalized, "input");
        procedureRecord.inputTypeName = normalized.constructor.name;
      }

      const outputSchema = orpcInternal?.outputSchema;
      if (isZodType(outputSchema)) {
        const normalized = unwrapZodSchema(outputSchema);
        procedureRecord.outputSchema = toJsonSchema(normalized, "output");
        procedureRecord.outputTypeName = normalized.constructor.name;
      }

      procedures.push(procedureRecord);
    },
  );

  await writeMdx(procedures);
})();

function isZodType(value: unknown): value is ZodType {
  return (
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as ZodType).safeParse === "function"
  );
}

function unwrapZodSchema(schema: ZodType): ZodType {
  const def = (
    schema as { _def?: { type?: string; schema?: unknown; out?: unknown } }
  )._def;

  if (!def?.type) {
    return schema;
  }

  if (
    ["optional", "nullable", "nullish", "default", "catch"].includes(
      def.type,
    ) &&
    "unwrap" in schema &&
    typeof schema.unwrap === "function"
  ) {
    return unwrapZodSchema(schema.unwrap());
  }

  if (def.type === "effects" && def.schema) {
    return unwrapZodSchema(def.schema as ZodType);
  }

  if (def.type === "pipeline" && def.out) {
    return unwrapZodSchema(def.out as ZodType);
  }

  return schema;
}

function toJsonSchema(schema: ZodType, io: "input" | "output") {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io,
    reused: "inline",
    cycles: "ref",
    unrepresentable: "any",
    override: (ctx) => {
      const def = (ctx.zodSchema as { _def?: { type?: string } })._def;
      if (def?.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  });
}

async function writeMdx(procedures: ProcedureDoc[]) {
  const filename = fileURLToPath(import.meta.url);
  const currentDir = dirname(filename);
  const docsDir = resolve(
    currentDir,
    "../../../apps/web/content/docs/concepts",
  );

  await ensureDir(docsDir);

  const mdxPath = resolve(docsDir, "sdk.mdx");
  const lines: string[] = [];

  lines.push("---");
  lines.push('title: "SDK"');
  lines.push("description: Reference for AgentStart SDK endpoints");
  lines.push("---");
  lines.push("");
  lines.push(
    "The endpoints below are generated from the oRPC router. Call them via `await start.api.<namespace>.<endpoint>(input)`.",
  );
  lines.push("");
  lines.push("## Calling API Endpoints on the Server");
  lines.push("");
  lines.push(
    "To call an API endpoint on the server, import your `start` instance and call the endpoint using the `api` object:",
  );
  lines.push("");
  lines.push('```ts title="lib/agent.ts"');
  lines.push('import { agentStart } from "agentstart";');
  lines.push("");
  lines.push("export const start = agentStart({");
  lines.push("  agent,");
  lines.push("  memory,");
  lines.push('  appName: "my-app",');
  lines.push("});");
  lines.push("");
  lines.push("// Calling endpoints on the server");
  lines.push("await start.api.thread.list()");
  lines.push("```");
  lines.push("");
  lines.push("## API Reference");
  lines.push("");

  for (const procedure of procedures) {
    const signature = `start.api.${procedure.method}`;
    lines.push(`## \`${procedure.method}\``);
    lines.push("");

    if (procedure.docMeta?.summary) {
      lines.push(`_Summary: ${procedure.docMeta.summary}_`);
      lines.push("");
    }

    if (procedure.docMeta?.description) {
      lines.push(procedure.docMeta.description);
      lines.push("");
    }

    lines.push("```ts");
    lines.push(`await ${signature}(${procedure.inputSchema ? "input" : ""});`);
    lines.push("```");
    lines.push("");

    const hasOutputSchema = Boolean(procedure.outputSchema);

    if (procedure.docMeta?.returnType && !hasOutputSchema) {
      lines.push(`**Returns:** \`${procedure.docMeta.returnType}\``);
      lines.push("");
    }

    if (procedure.docMeta?.examples?.length) {
      lines.push("#### Examples");
      lines.push("");
      for (const example of procedure.docMeta.examples) {
        if (example.title) {
          lines.push(`**${example.title}**`);
          lines.push("");
        }
        lines.push("```ts");
        lines.push(example.code.trim());
        lines.push("```");
        lines.push("");
      }
    }

    if (procedure.inputSchema) {
      lines.push("### Input");
      lines.push("");
      const typeTable = schemaToTypeTable(
        procedure.inputSchema,
        procedure.method,
      );
      if (typeTable) {
        appendTypeTable(lines, typeTable);
      } else {
        lines.push("```json");
        lines.push(JSON.stringify(procedure.inputSchema, null, 2));
        lines.push("```");
      }
      lines.push("");
    }

    if (hasOutputSchema) {
      lines.push("### Output");
      lines.push("");
      const typeTable = schemaToTypeTable(
        procedure.outputSchema,
        procedure.method,
      );
      if (typeTable) {
        appendTypeTable(lines, typeTable);
      } else {
        lines.push("```json");
        lines.push(JSON.stringify(procedure.outputSchema, null, 2));
        lines.push("```");
      }
      lines.push("");
    }
  }

  await writeFile(mdxPath, `${lines.join("\n")}\n`, "utf8");
}

function schemaToTypeTable(
  schema: unknown,
  procedureMethod?: string,
): TypeTableShape | null {
  if (!schema || typeof schema !== "object") {
    return null;
  }

  const json = schema as JSONSchema;

  if (isArraySchema(json)) {
    const info = getTypeInfo(json);
    const entry = buildTypeTableEntry(json, info, true, procedureMethod);
    return {
      items: entry,
    };
  }

  if (!isObjectSchema(json) || !json.properties) {
    return null;
  }

  const requiredSet = new Set(json.required ?? []);
  const entries: TypeTableShape = {};

  for (const [key, raw] of Object.entries(json.properties ?? {})) {
    const propertySchema = raw as JSONSchema;
    const info = getTypeInfo(propertySchema);
    entries[key] = buildTypeTableEntry(
      propertySchema,
      info,
      requiredSet.has(key),
      procedureMethod,
    );
  }

  return Object.keys(entries).length ? entries : null;
}

function buildTypeTableEntry(
  schema: JSONSchema,
  info: TypeInfo,
  required: boolean,
  procedureMethod?: string,
): TypeTableEntry {
  let entry: TypeTableEntry = {
    type: info.short,
  };

  // 特殊处理：消息数组的类型
  if (
    info.short === "Array<unknown>" &&
    isArraySchema(schema) &&
    (procedureMethod === "message.get" ||
      procedureMethod === "thread.loadMessages")
  ) {
    entry = {
      ...entry,
      type: "Array<UIMessage>",
      typeDescription:
        "Array<{ id: string; role: string; parts: MessagePart[]; metadata?: object }>",
      description:
        "Array of UI messages. Each message part can be text, tool-call, or tool-result.",
      properties: {
        id: { type: "string", required: true },
        role: {
          type: '"system" | "user" | "assistant"',
          required: true,
        },
        parts: {
          type: "Array<MessagePart>",
          description: "Message parts (text, tool-call, tool-result)",
          required: true,
        },
        metadata: {
          type: "object",
          description: "Optional metadata",
        },
      },
    };
  }

  // 特殊处理：如果是 Array<unknown> 且有 anyOf/oneOf
  else if (info.short === "Array<unknown>" && isArraySchema(schema)) {
    const itemSchema = schema.items as JSONSchema | undefined;
    if (itemSchema?.anyOf || itemSchema?.oneOf) {
      const variants = (itemSchema.anyOf || itemSchema.oneOf) as JSONSchema[];
      if (variants.length > 0) {
        const variantTypes = variants
          .map((v) => {
            const variantInfo = getTypeInfo(v);
            return variantInfo.short;
          })
          .join(" | ");

        entry = {
          ...entry,
          type: `Array<${variantTypes}>`,
          typeDescription: `Array<${variants
            .map((v) => {
              const variantInfo = getTypeInfo(v);
              return variantInfo.detailed || variantInfo.short;
            })
            .join(" | ")}>`,
        };

        const firstObjectVariant = variants.find((v) =>
          isObjectSchema(v as JSONSchema),
        );
        if (
          firstObjectVariant &&
          isObjectSchema(firstObjectVariant as JSONSchema)
        ) {
          const nestedProperties: TypeTableShape = {};
          const requiredSet = new Set(
            (firstObjectVariant as JSONSchema).required ?? [],
          );

          for (const [key, raw] of Object.entries(
            (firstObjectVariant as JSONSchema).properties ?? {},
          )) {
            const propertySchema = raw as JSONSchema;
            const propertyInfo = getTypeInfo(propertySchema);
            nestedProperties[key] = buildTypeTableEntry(
              propertySchema,
              propertyInfo,
              requiredSet.has(key),
              procedureMethod,
            );
          }

          if (Object.keys(nestedProperties).length) {
            entry.properties = nestedProperties;
          }
        }
      }
    }
  }

  if (required) {
    entry.required = true;
  }

  if (!entry.typeDescription && info.detailed && info.detailed !== info.short) {
    entry.typeDescription = info.detailed;
  }

  if (typeof schema.default !== "undefined") {
    entry.default = formatLiteral(schema.default);
  }

  if (schema.deprecated === true) {
    entry.deprecated = true;
  }

  // For object types, generate nested properties structure
  if (isObjectSchema(schema) && schema.properties) {
    const nestedProperties: TypeTableShape = {};
    const requiredSet = new Set(schema.required ?? []);

    for (const [key, raw] of Object.entries(schema.properties)) {
      const propertySchema = raw as JSONSchema;
      const propertyInfo = getTypeInfo(propertySchema);
      nestedProperties[key] = buildTypeTableEntry(
        propertySchema,
        propertyInfo,
        requiredSet.has(key),
      );
    }

    if (Object.keys(nestedProperties).length) {
      entry.properties = nestedProperties;
    }
  }

  const descriptionParts: string[] = [];

  if (typeof schema.description === "string" && schema.description.trim()) {
    descriptionParts.push(schema.description.trim());
  }

  // Only add summary if it's not about properties (properties are now in the properties field)
  if (info.summary && !info.summary.includes("Properties:")) {
    descriptionParts.push(info.summary);
  }

  if (Array.isArray(schema.examples) && schema.examples.length) {
    const examples = schema.examples
      .map((example) => formatLiteral(example))
      .filter((value): value is string => Boolean(value));
    if (examples.length) {
      descriptionParts.push(`Examples: ${examples.join(", ")}`);
    }
  }

  if (descriptionParts.length) {
    entry.description = descriptionParts.join("\n\n");
  }

  return entry;
}

function isObjectSchema(schema: JSONSchema): boolean {
  return schema.type === "object" || typeof schema.properties === "object";
}

function isArraySchema(schema: JSONSchema): boolean {
  return schema.type === "array" || schema.items != null;
}

function getTypeInfo(schema: JSONSchema | undefined): TypeInfo {
  if (!schema || typeof schema !== "object") {
    return { short: "unknown" };
  }

  if (Array.isArray(schema.enum) && schema.enum.length) {
    const values = schema.enum.map((value) => formatLiteral(value));
    const union = values.join(" | ");
    return applyNullable(schema, {
      short: union.length <= 60 ? union : `enum(${values.length})`,
      detailed: union,
      summary: `Allowed values: ${values.join(", ")}`,
    });
  }

  if (schema.const !== undefined) {
    const value = formatLiteral(schema.const);
    return applyNullable(schema, {
      short: value,
      detailed: value,
      summary: `Constant value: ${value}`,
    });
  }

  if (Array.isArray(schema.type) && schema.type.length) {
    const normalized = schema.type.filter((value): value is string => !!value);
    if (normalized.length) {
      const infos = normalized.map((value) =>
        getTypeInfo({ ...schema, type: value }),
      );
      return applyNullable(schema, combineUnionTypeInfo(infos));
    }
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    const infos = schema.anyOf.map((option) =>
      getTypeInfo(option as JSONSchema),
    );
    return applyNullable(schema, combineUnionTypeInfo(infos));
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
    const infos = schema.oneOf.map((option) =>
      getTypeInfo(option as JSONSchema),
    );
    return applyNullable(schema, combineUnionTypeInfo(infos));
  }

  if (isArraySchema(schema)) {
    return applyNullable(schema, getArrayTypeInfo(schema));
  }

  if (isObjectSchema(schema)) {
    return applyNullable(schema, getObjectTypeInfo(schema));
  }

  if (schema.type === "string") {
    return applyNullable(schema, getStringTypeInfo(schema));
  }

  if (schema.type === "number" || schema.type === "integer") {
    return applyNullable(
      schema,
      getNumberTypeInfo(
        schema,
        schema.type === "integer" ? "integer" : "number",
      ),
    );
  }

  if (schema.type === "boolean") {
    return applyNullable(schema, { short: "boolean" });
  }

  if (schema.type === "null") {
    return { short: "null" };
  }

  if (typeof schema.$ref === "string") {
    return { short: schema.$ref };
  }

  return { short: "unknown" };
}

function combineUnionTypeInfo(infos: TypeInfo[]): TypeInfo {
  if (infos.length === 0) {
    return { short: "unknown" };
  }

  const short = infos.map((info) => info.short).join(" | ");
  const detailed = infos.map((info) => info.detailed ?? info.short).join(" | ");

  const summaries = infos
    .map((info, index) =>
      info.summary
        ? infos.length > 1
          ? `Variant ${index + 1}: ${info.summary}`
          : info.summary
        : undefined,
    )
    .filter((value): value is string => Boolean(value));

  return {
    short,
    detailed,
    summary: summaries.length ? summaries.join("\n\n") : undefined,
  };
}

function getArrayTypeInfo(schema: JSONSchema): TypeInfo {
  const rawItems = schema.items;
  let itemInfo: TypeInfo;

  if (Array.isArray(rawItems)) {
    const first = rawItems[0] as JSONSchema | undefined;
    itemInfo = getTypeInfo(first);
  } else {
    itemInfo = getTypeInfo(rawItems as JSONSchema);
  }

  const base = itemInfo.detailed ?? itemInfo.short;
  const short = `Array<${itemInfo.short}>`;
  const detailed = `Array<${base}>`;

  const summaryParts: string[] = [];
  const lengthConstraints: string[] = [];

  if (typeof schema.minItems === "number") {
    lengthConstraints.push(`min ${schema.minItems}`);
  }
  if (typeof schema.maxItems === "number") {
    lengthConstraints.push(`max ${schema.maxItems}`);
  }

  if (lengthConstraints.length) {
    summaryParts.push(`Length constraints: ${lengthConstraints.join(", ")}`);
  }

  if (itemInfo.summary) {
    summaryParts.push(
      itemInfo.summary.includes("\n")
        ? `Items:\n${indent(itemInfo.summary, 2)}`
        : `Items: ${itemInfo.summary}`,
    );
  }

  return {
    short,
    detailed,
    summary: summaryParts.length ? summaryParts.join("\n\n") : undefined,
  };
}

function getObjectTypeInfo(schema: JSONSchema): TypeInfo {
  const properties = schema.properties ?? {};
  const entries = Object.entries(properties);

  if (!entries.length) {
    return { short: "{}", detailed: "{}", summary: undefined };
  }

  const requiredSet = new Set(schema.required ?? []);
  const signatures: string[] = [];
  const propertyLines: string[] = [];

  for (const [key, raw] of entries) {
    const propertySchema = raw as JSONSchema;
    const info = getTypeInfo(propertySchema);
    const isRequired = requiredSet.has(key);
    const propertyType = info.detailed ?? info.short;
    signatures.push(`${key}${isRequired ? "" : "?"}: ${propertyType}`);

    let line = `- \`${key}${isRequired ? "" : "?"}\` (\`${info.short}\`)`;

    const extraTexts: string[] = [];

    if (
      typeof propertySchema.description === "string" &&
      propertySchema.description.trim()
    ) {
      extraTexts.push(propertySchema.description.trim());
    }

    if (info.summary) {
      extraTexts.push(info.summary);
    }

    const firstText = extraTexts[0];
    if (extraTexts.length === 1 && firstText && !firstText.includes("\n")) {
      line += ` – ${firstText}`;
    } else if (extraTexts.length > 0) {
      line += `\n  ${extraTexts.map((text) => indent(text, 2)).join("\n  ")}`;
    }

    propertyLines.push(line);
  }

  const summaryParts: string[] = [];

  if (propertyLines.length) {
    summaryParts.push(`Properties:\n${propertyLines.join("\n")}`);
  }

  if (
    schema.additionalProperties !== undefined &&
    schema.additionalProperties !== false
  ) {
    summaryParts.push("Additional properties allowed");
  }

  const signature = `{ ${signatures.join("; ")} }`;

  return {
    short: "object",
    detailed: signature,
    summary: summaryParts.length ? summaryParts.join("\n\n") : undefined,
  };
}

function getStringTypeInfo(schema: JSONSchema): TypeInfo {
  const constraints: string[] = [];

  if (typeof schema.minLength === "number") {
    constraints.push(`min length ${schema.minLength}`);
  }
  if (typeof schema.maxLength === "number") {
    constraints.push(`max length ${schema.maxLength}`);
  }
  if (typeof schema.pattern === "string") {
    constraints.push(`pattern ${schema.pattern}`);
  }
  if (typeof schema.format === "string") {
    constraints.push(`format ${schema.format}`);
  }

  return {
    short: "string",
    detailed: schema.format ? `string (${schema.format})` : undefined,
    summary: constraints.length
      ? `Constraints: ${constraints.join(", ")}`
      : undefined,
  };
}

function getNumberTypeInfo(schema: JSONSchema, base: string): TypeInfo {
  const constraints: string[] = [];
  const isInteger = base === "integer";

  if (typeof schema.minimum === "number") {
    constraints.push(`≥ ${schema.minimum}`);
  }
  if (typeof schema.exclusiveMinimum === "number") {
    constraints.push(`> ${schema.exclusiveMinimum}`);
  }
  if (typeof schema.maximum === "number") {
    constraints.push(`≤ ${schema.maximum}`);
  }
  if (typeof schema.exclusiveMaximum === "number") {
    constraints.push(`< ${schema.exclusiveMaximum}`);
  }
  if (typeof schema.multipleOf === "number") {
    constraints.push(`multiple of ${schema.multipleOf}`);
  }

  return {
    short: "number",
    detailed: isInteger ? "integer" : undefined,
    summary: constraints.length
      ? `Constraints: ${constraints.join(", ")}`
      : undefined,
  };
}

function applyNullable(schema: JSONSchema, info: TypeInfo): TypeInfo {
  if (schema.nullable === true && !info.short.includes("null")) {
    const short = `${info.short} | null`;
    const detailed = info.detailed ? `${info.detailed} | null` : undefined;
    const summary = info.summary
      ? `${info.summary}\nAccepts null.`
      : "Accepts null.";
    return {
      short,
      detailed,
      summary,
    };
  }

  return info;
}

function formatLiteral(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

function appendTypeTable(lines: string[], typeTable: TypeTableShape) {
  const entries = Object.entries(typeTable);
  lines.push("<TypeTable");
  lines.push("  type={{");

  entries.forEach(([key, entry], index) => {
    const rendered = renderTypeTableEntry(entry);
    const suffix = index < entries.length - 1 ? "," : "";
    lines.push(`    ${key}: ${rendered}${suffix}`);
  });

  lines.push("  }}");
  lines.push("/>");
}

function renderTypeTableEntry(entry: TypeTableEntry): string {
  const segments: string[] = [];
  segments.push(`type: '${escapeString(entry.type)}'`);
  if (entry.description) {
    segments.push(`description: '${escapeString(entry.description)}'`);
  }
  if (entry.typeDescription) {
    segments.push(`typeDescription: '${escapeString(entry.typeDescription)}'`);
  }
  if (entry.typeDescriptionLink) {
    segments.push(
      `typeDescriptionLink: '${escapeString(entry.typeDescriptionLink)}'`,
    );
  }
  if (entry.default) {
    segments.push(`default: '${escapeString(entry.default)}'`);
  }
  if (entry.required) {
    segments.push("required: true");
  }
  if (entry.deprecated) {
    segments.push("deprecated: true");
  }
  if (entry.parameters && entry.parameters.length > 0) {
    const paramsStr = entry.parameters
      .map(
        (param) =>
          `{ name: '${escapeString(param.name)}', description: '${escapeString(param.description)}' }`,
      )
      .join(", ");
    segments.push(`parameters: [${paramsStr}]`);
  }
  if (entry.returns) {
    segments.push(`returns: '${escapeString(entry.returns)}'`);
  }
  if (entry.properties) {
    const propsEntries = Object.entries(entry.properties);
    const propsStr = propsEntries
      .map(([key, prop]) => `${key}: ${renderTypeTableEntry(prop)}`)
      .join(", ");
    segments.push(`properties: { ${propsStr} }`);
  }
  return `{ ${segments.join(", ")} }`;
}

function escapeString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, "\\n");
}

function extractDocMeta(meta: unknown): DocMeta | undefined {
  if (!meta || typeof meta !== "object") {
    return undefined;
  }

  const container = meta as Record<string, unknown>;
  const docCandidate =
    typeof container.doc === "object" && container.doc !== null
      ? container.doc
      : meta;
  if (!docCandidate || typeof docCandidate !== "object") {
    return undefined;
  }

  const record = docCandidate as Record<string, unknown>;
  const result: DocMeta = {};

  if (typeof record.summary === "string") {
    result.summary = record.summary;
  }

  if (typeof record.description === "string") {
    result.description = record.description;
  }

  if (typeof record.returnType === "string") {
    result.returnType = record.returnType;
  }

  if (Array.isArray(record.examples)) {
    const examples: DocMetaExample[] = [];
    for (const example of record.examples) {
      if (!example || typeof example !== "object") {
        continue;
      }
      const exampleRecord = example as Record<string, unknown>;
      const rawCode = exampleRecord.code;
      if (typeof rawCode !== "string") {
        continue;
      }
      const code = rawCode.trim();
      if (!code) {
        continue;
      }
      const rawTitle = exampleRecord.title;
      const title =
        typeof rawTitle === "string" && rawTitle.trim().length
          ? rawTitle
          : undefined;
      examples.push({ code, title });
    }
    if (examples.length) {
      result.examples = examples;
    }
  }

  return Object.keys(result).length ? result : undefined;
}
