/* agent-frontmatter:start
AGENT: ID generation utilities
PURPOSE: Generate unique identifiers for entities
USAGE: Import generateId or generateUuidFromData
EXPORTS: generateId, generateUuidFromData
FEATURES:
  - Short alphanumeric IDs via nanoid
  - Deterministic UUIDs from arbitrary data via UUIDv5
SEARCHABLE: id generation, uuid, nanoid, unique identifier
agent-frontmatter:end */

import { customAlphabet } from "nanoid";
import { v5 as uuidv5 } from "uuid";

export function generateId() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 10);
  return nanoid();
}

/**
 * Generates a deterministic UUID from any input data using UUIDv5
 * @param data - Any data type that will be serialized to generate the UUID
 * @returns A UUID v5 string
 */
export function generateUuidFromData(data: unknown): string {
  // Using a custom namespace for this application
  const NAMESPACE = "agentstart";

  // Serialize the input data to a string
  const serialized = typeof data === "string" ? data : JSON.stringify(data);

  return uuidv5(serialized, NAMESPACE);
}
