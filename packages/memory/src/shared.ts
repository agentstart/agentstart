/* agent-frontmatter:start
AGENT: Memory adapter shared utilities
PURPOSE: Provides common utility functions used across all database adapters
USAGE: Import shared functions to reduce code duplication in adapters
EXPORTS: toComparable, compareValues, validateTable, validateField
FEATURES:
  - Value normalization for sorting and comparison
  - Schema validation helpers
  - Type-safe field retrieval
SEARCHABLE: packages, agentstart, src, memory, adapter, shared, utilities, validation
agent-frontmatter:end */

import { AgentStartError } from "@agentstart/utils";
import type { MemoryAdapterDbSchema } from "./get-tables";

// Type aliases for better readability
type Tables = MemoryAdapterDbSchema;
type Table = Tables[string];

/**
 * Converts a value to a comparable format (string or number) for sorting operations.
 *
 * This function normalizes different data types into a format that can be consistently
 * compared and sorted across all database adapters. It handles dates, numbers, booleans,
 * strings, and null/undefined values.
 *
 * @param value - The value to convert (can be any type)
 * @param options - Optional configuration for conversion behavior
 * @param options.caseInsensitive - Whether to convert strings to lowercase for case-insensitive comparison (default: false)
 * @returns A string or number that can be used for comparison operations
 *
 * @example
 * toComparable(new Date('2024-01-01')) // Returns timestamp number
 * toComparable(true) // Returns 1
 * toComparable("Hello") // Returns "Hello"
 * toComparable("Hello", { caseInsensitive: true }) // Returns "hello"
 */
export const toComparable = (
  value: unknown,
  options: { caseInsensitive?: boolean } = {},
): string | number => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    return options.caseInsensitive ? value.toLowerCase() : value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  return options.caseInsensitive ? stringValue.toLowerCase() : stringValue;
};

/**
 * Compares two values for sorting purposes.
 *
 * This function uses toComparable to normalize both values and then performs
 * a comparison suitable for use in sort functions. String values are compared
 * using localeCompare for proper Unicode handling.
 *
 * @param left - The first value to compare
 * @param right - The second value to compare
 * @param options - Optional configuration for comparison behavior
 * @param options.caseInsensitive - Whether to perform case-insensitive comparison for strings
 * @returns A negative number if left < right, positive if left > right, or 0 if equal
 *
 * @example
 * [3, 1, 2].sort((a, b) => compareValues(a, b)) // [1, 2, 3]
 * ["c", "a", "b"].sort((a, b) => compareValues(a, b)) // ["a", "b", "c"]
 */
export const compareValues = (
  left: unknown,
  right: unknown,
  options: { caseInsensitive?: boolean } = {},
): number => {
  const leftComparable = toComparable(left, options);
  const rightComparable = toComparable(right, options);

  // Use localeCompare for strings to handle Unicode correctly
  if (
    typeof leftComparable === "string" &&
    typeof rightComparable === "string"
  ) {
    return leftComparable.localeCompare(rightComparable);
  }

  // Convert to numbers for numeric comparison
  const leftNumber =
    typeof leftComparable === "number"
      ? leftComparable
      : Number(leftComparable);
  const rightNumber =
    typeof rightComparable === "number"
      ? rightComparable
      : Number(rightComparable);

  return leftNumber - rightNumber;
};

/**
 * Validates that a table exists in the schema and returns it.
 *
 * This function checks if the specified model exists in the schema and throws
 * a descriptive error if it doesn't. This helps provide clear error messages
 * when schema configuration is incorrect.
 *
 * @param schema - The complete schema object containing all tables
 * @param model - The model name to look up
 * @param adapterName - The name of the adapter (for error messages)
 * @returns The table definition from the schema
 * @throws {AgentStartError} When the table is not found in the schema
 *
 * @example
 * const userTable = validateTable(schema, "user", "prisma")
 * // Returns the user table definition or throws if not found
 */
export const validateTable = (
  schema: Tables,
  model: string,
  adapterName: string,
): Table => {
  const table = schema[model];
  if (!table) {
    throw new AgentStartError(
      `${adapterName.toUpperCase()}_TABLE_MISSING`,
      `Table "${model}" not found in schema. Please ensure the table is defined in your schema configuration.`,
    );
  }
  return table;
};

/**
 * Validates that a field exists in a table and returns the field name.
 *
 * This function checks if the specified field exists in the table schema
 * and returns either the custom fieldName or the field name itself. The "id"
 * field is always considered valid and returned as-is.
 *
 * @param table - The table definition to search in
 * @param field - The field name to look up
 * @param model - The model name (for error messages)
 * @param adapterName - The name of the adapter (for error messages)
 * @returns The actual field name to use in database queries (may differ from input if fieldName is set)
 * @throws {AgentStartError} When the field is not found in the table
 *
 * @example
 * const fieldName = validateField(userTable, "email", "user", "prisma")
 * // Returns "email" or the custom fieldName if defined
 */
export const validateField = (
  table: Table,
  field: string,
  model: string,
  adapterName: string,
): string => {
  // ID field is always valid
  if (field === "id") {
    return field;
  }

  const fieldDef = table.fields[field];
  if (!fieldDef) {
    throw new AgentStartError(
      `${adapterName.toUpperCase()}_FIELD_MISSING`,
      `Field "${field}" not found in table "${model}". Available fields: ${Object.keys(table.fields).join(", ")}`,
    );
  }

  return fieldDef.fieldName || field;
};

/**
 * Creates a getField function bound to a specific schema and adapter.
 *
 * This factory function creates a field getter that validates and retrieves
 * field names with the schema and adapter context already bound. This is
 * useful for creating adapter-specific field retrieval functions.
 *
 * @param schema - The schema object containing table definitions
 * @param adapterName - The name of the adapter (for error messages)
 * @returns A function that takes (model, field) and returns the validated field name
 *
 * @example
 * const getField = createGetFieldFunction(schema, "prisma")
 * const emailField = getField("user", "email")
 */
export const createGetFieldFunction = (schema: Tables, adapterName: string) => {
  return (model: string, field: string): string => {
    const table = validateTable(schema, model, adapterName);
    return validateField(table, field, model, adapterName);
  };
};
