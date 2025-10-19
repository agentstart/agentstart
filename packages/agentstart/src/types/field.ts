/* agent-frontmatter:start
AGENT: Field metadata types
PURPOSE: Define schema field structures shared across adapters and generators
USAGE: import type { FieldAttribute } from "agentstart"
EXPORTS: FieldType, FieldAttributeConfig, FieldAttribute, InferFieldsInput, InferFieldsOutput, InferFieldsInputClient, PluginFieldAttribute, InferFieldsFromPlugins
FEATURES:
  - Captures shared metadata for thread/message fields
  - Supports plugin-driven schema augmentation
SEARCHABLE: field attribute types, schema metadata, plugin field inference
agent-frontmatter:end */

import type { AgentStartOptions } from "./adapter";

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | `${"string" | "number"}[]`
  | string[];

type Primitive =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | string[]
  | number[];

export type FieldAttributeConfig<_T extends FieldType = FieldType> = {
  required?: boolean;
  returned?: boolean;
  input?: boolean;
  defaultValue?: Primitive | (() => Primitive);
  transform?: {
    input?: (value: Primitive) => Primitive | Promise<Primitive>;
    output?: (value: Primitive) => Primitive | Promise<Primitive>;
  };
  references?: {
    model: string;
    field: string;
    onDelete?:
      | "no action"
      | "restrict"
      | "cascade"
      | "set null"
      | "set default";
  };
  unique?: boolean;
  bigint?: boolean;
  validator?: {
    input?: unknown;
    output?: unknown;
  };
  fieldName?: string;
  sortable?: boolean;
};

export type FieldAttribute<T extends FieldType = FieldType> = {
  type: T;
} & FieldAttributeConfig<T>;

export type InferValueType<T extends FieldType> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : T extends "boolean"
      ? boolean
    : T extends "date"
      ? Date
      : T extends "json"
        ? unknown
        : T extends `${infer Inner}[]`
          ? Inner extends "string"
            ? string[]
            : number[]
          : // biome-ignore lint/suspicious/noExplicitAny: is fine
            T extends Array<any>
            ? T[number]
            : never;

export type InferFieldsOutput<Field> = Field extends Record<
  infer Key,
  FieldAttribute
>
  ? {
      [key in Key as Field[key]["required"] extends false
        ? Field[key]["defaultValue"] extends boolean | string | number | Date
          ? key
          : never
        : key]: InferFieldOutput<Field[key]>;
    } & {
      [key in Key as Field[key]["returned"] extends false
        ? never
        : key]?: InferFieldOutput<Field[key]> | null;
    }
  : object;

export type InferFieldsInput<Field> = Field extends Record<
  infer Key,
  FieldAttribute
>
  ? {
      [key in Key as Field[key]["required"] extends false
        ? never
        : Field[key]["defaultValue"] extends string | number | boolean | Date
          ? never
          : Field[key]["input"] extends false
            ? never
            : key]: InferFieldInput<Field[key]>;
    } & {
      [key in Key as Field[key]["input"] extends false ? never : key]?:
        | InferFieldInput<Field[key]>
        | undefined
        | null;
    }
  : object;

export type InferFieldsInputClient<Field> = Field extends Record<
  infer Key,
  FieldAttribute
>
  ? {
      [key in Key as Field[key]["required"] extends false
        ? never
        : Field[key]["defaultValue"] extends string | number | boolean | Date
          ? never
          : Field[key]["input"] extends false
            ? never
            : key]: InferFieldInput<Field[key]>;
    } & {
      [key in Key as Field[key]["input"] extends false
        ? never
        : Field[key]["required"] extends false
          ? key
          : Field[key]["defaultValue"] extends string | number | boolean | Date
            ? key
            : never]?: InferFieldInput<Field[key]> | undefined | null;
    }
  : object;

type InferFieldOutput<T extends FieldAttribute> = T["returned"] extends false
  ? never
  : T["required"] extends false
    ? InferValueType<T["type"]> | undefined | null
    : InferValueType<T["type"]>;

type InferFieldInput<T extends FieldAttribute> = InferValueType<T["type"]>;

export type PluginFieldAttribute = Omit<
  FieldAttribute,
  "transform" | "defaultValue" | "hashValue"
>;

export type InferFieldsFromPlugins<
  Options extends AgentStartOptions,
  Key extends string,
  Format extends "output" | "input" = "output",
> = "plugins" extends keyof Options
  ? Options["plugins"] extends Array<infer T>
    ? T extends {
        schema: {
          [key in Key]: {
            fields: infer Field;
          };
        };
      }
      ? Format extends "output"
        ? InferFieldsOutput<Field>
        : InferFieldsInput<Field>
      : object
    : object
  : object;

export type InferFieldsFromOptions<
  Options extends AgentStartOptions,
  Key extends "thread" | "user",
  Format extends "output" | "input" = "output",
> = Key extends keyof Options
  ? Options[Key] extends {
      additionalFields: infer Field;
    }
    ? Format extends "output"
      ? InferFieldsOutput<Field>
      : InferFieldsInput<Field>
    : object
  : object;
