/* agent-frontmatter:start
AGENT: Adapter factory
PURPOSE: Provide helpers for building storage adapters across databases
USAGE: Import to define adapters like Drizzle, Prisma, or Mongo integrations
EXPORTS: createAdapterFactory
FEATURES:
  - Normalizes adapter metadata
  - Injects shared runtime helpers
  - Keeps adapter implementations framework-agnostic
SEARCHABLE: adapter factory, storage adapter, persistence helpers
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/errors";

/**
 * Unified logging signature every adapter uses when emitting debug
 * information about lifecycle events (create/update/etc).
 */
export type AdapterDebugLogger = (event: string, payload?: unknown) => void;

export interface DatabaseAdapterMetadata {
  adapterId: string;
  adapterName: string;
  usePlural?: boolean;
  supportsJSON?: boolean;
  supportsDates?: boolean;
  supportsBooleans?: boolean;
  supportsNumericIds?: boolean;
}

export interface AdapterCreateArgs<TData = Record<string, unknown>> {
  model: string;
  data: TData;
  select?: string[];
  allowId?: boolean;
}

export interface AdapterUpdateArgs<TUpdate = Record<string, unknown>> {
  model: string;
  where: unknown;
  update: TUpdate;
  select?: string[];
}

export interface AdapterUpdateManyArgs<TUpdate = Record<string, unknown>> {
  model: string;
  where: unknown;
  update: TUpdate;
  select?: string[];
}

export interface AdapterDeleteArgs<TWhere = unknown> {
  model: string;
  where: TWhere;
  select?: string[];
}

export interface AdapterFindOneArgs<TWhere = unknown> {
  model: string;
  where: TWhere;
  select?: string[];
}

export interface AdapterFindManyArgs<TWhere = unknown> {
  model: string;
  where?: TWhere;
  limit?: number;
  offset?: number;
  sortBy?: Array<{
    field: string;
    direction?: "asc" | "desc";
  }>;
  select?: string[];
}

export interface AdapterCountArgs<TWhere = unknown> {
  model: string;
  where?: TWhere;
}

export interface AdapterCreateSchemaArgs {
  tables: Record<string, unknown>;
  file?: string;
}

export interface DatabaseAdapterMethods {
  create(args: AdapterCreateArgs): Promise<unknown>;
  update(args: AdapterUpdateArgs): Promise<unknown>;
  updateMany(args: AdapterUpdateManyArgs): Promise<number>;
  delete(args: AdapterDeleteArgs): Promise<unknown>;
  deleteMany(args: AdapterDeleteArgs): Promise<number>;
  findOne(args: AdapterFindOneArgs): Promise<unknown | undefined | null>;
  findMany(args: AdapterFindManyArgs): Promise<unknown[]>;
  count(args: AdapterCountArgs): Promise<number>;
  options?: unknown;
  createSchema?(args: AdapterCreateSchemaArgs): Promise<void> | void;
  transaction?: <TReturn>(
    run: (adapter: DatabaseAdapterMethods) => Promise<TReturn> | TReturn,
  ) => Promise<TReturn> | TReturn | false;
}

export interface AdapterFactoryHooks<TOptions> {
  logger?: (params: {
    options: TOptions;
    defaultLogger: AdapterDebugLogger;
  }) => AdapterDebugLogger;
  normalizeModelName?: (params: { model: string; options: TOptions }) => string;
  normalizeFieldName?: (params: {
    model: string;
    field: string;
    options: TOptions;
  }) => string;
}

export interface AdapterFactoryContext<TOptions> {
  options: TOptions;
  schema: Record<string, unknown>;
  debugLog: AdapterDebugLogger;
  log: AdapterDebugLogger;
  wrapOperation: <TArgs, TResult>(
    operation: string,
    handler: (args: TArgs) => Promise<TResult>,
  ) => (args: TArgs) => Promise<TResult>;
  normalizeModelName: (model: string) => string;
  normalizeFieldName: (model: string, field: string) => string;
  getField: (model: string, field: string) => unknown;
  getDefaultModelName: (model: string) => string;
  getDefaultFieldName: (model: string, field: string) => string;
  getFieldAttributes: (model: string, field: string) => Record<string, unknown>;
}

export interface DatabaseAdapterDefinition<
  TOptions,
  TMethods extends DatabaseAdapterMethods,
> {
  config:
    | DatabaseAdapterMetadata
    | ((options: TOptions) => DatabaseAdapterMetadata);
  hooks?: AdapterFactoryHooks<TOptions>;
  adapter: (context: AdapterFactoryContext<TOptions>) => TMethods;
}

export interface DatabaseAdapterInstance<
  TOptions,
  TMethods extends DatabaseAdapterMethods,
> {
  config: DatabaseAdapterMetadata;
  initialize: (
    context: Omit<
      AdapterFactoryContext<TOptions>,
      | "options"
      | "debugLog"
      | "log"
      | "wrapOperation"
      | "normalizeModelName"
      | "normalizeFieldName"
    > & {
      debugLog?: AdapterDebugLogger;
    },
  ) => TMethods;
}

/**
 * Builds an adapter instance factory. Each adapter (Prisma, Drizzle, etc.)
 * calls this with its own driver-specific implementation while the factory
 * handles cross-cutting concerns such as logging, context shaping, and
 * option normalization.
 */
export function createAdapterFactory<
  TOptions,
  TMethods extends DatabaseAdapterMethods,
>(definition: DatabaseAdapterDefinition<TOptions, TMethods>) {
  return (options: TOptions): DatabaseAdapterInstance<TOptions, TMethods> => {
    const resolvedConfig =
      typeof definition.config === "function"
        ? definition.config(options)
        : definition.config;

    if (!resolvedConfig?.adapterId || !resolvedConfig?.adapterName) {
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_CONFIG",
        "Database adapter config must include adapterId and adapterName.",
      );
    }

    return {
      config: resolvedConfig,
      initialize: (context) => {
        const defaultLogger = context.debugLog ?? (() => undefined);

        const resolvedLogger =
          definition.hooks?.logger?.({
            options,
            defaultLogger,
          }) ?? defaultLogger;

        const normalizeModelName = definition.hooks?.normalizeModelName
          ? (model: string) =>
              definition.hooks!.normalizeModelName!({
                model,
                options,
              })
          : (model: string) => model;

        const normalizeFieldName = definition.hooks?.normalizeFieldName
          ? (model: string, field: string) =>
              definition.hooks!.normalizeFieldName!({
                model,
                field,
                options,
              })
          : (_model: string, field: string) => field;

        // Wraps each adapter method so debug logging stays consistent.
        const wrapOperation = <TArgs, TResult>(
          operation: string,
          handler: (args: TArgs) => Promise<TResult>,
        ) => {
          return async (args: TArgs) => {
            resolvedLogger(operation, args);
            return handler(args);
          };
        };

        // Hand control back to the adapter—we supply the enriched context.
        return definition.adapter({
          ...context,
          debugLog: defaultLogger,
          log: resolvedLogger,
          wrapOperation,
          normalizeModelName,
          normalizeFieldName,
          options,
        });
      },
    };
  };
}
