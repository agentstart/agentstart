/* agent-frontmatter:start
AGENT: Data parts extraction and retrieval hooks
PURPOSE: React hooks for accessing typed data parts from AI message streams
USAGE: Import useDataPart or useDataParts to retrieve custom data from agent responses
EXPORTS: useDataPart, useDataParts, AgentStartDataUIPart
FEATURES:
  - Automatic type inference based on data part key
  - Extracts data parts from messages and tool results
  - Memoized extraction for performance
  - Clear function to remove data parts from store
  - Support for multiple agent stores via storeId
SEARCHABLE: data parts, useDataPart, message stream, type inference, agent data
agent-frontmatter:end */

"use client";

import type { DataUIPart, UIMessage } from "ai";
import { useCallback, useMemo } from "react";
import type { AgentStartDataPart } from "@/agent";
import { useAgentStore } from "./store";

export type AgentStartDataUIPart = DataUIPart<AgentStartDataPart>;

/**
 * Maps data part keys (with "data-" prefix) to their corresponding data types
 *
 * This type transformation enables automatic type inference when using useDataPart.
 * For example:
 * - "data-agentstart-suggestions" -> { prompts: string[] }
 * - "data-agentstart-title_update" -> { title: string }
 *
 * @example
 * const [suggestions] = useDataPart("data-agentstart-suggestions");
 * // suggestions is automatically typed as { prompts: string[] } | null
 */
type DataPartTypeMap = {
  [K in keyof AgentStartDataPart as `data-${K & string}`]: AgentStartDataPart[K];
};

/**
 * All valid data part keys that can be used with useDataPart hook
 * These are the keys from AgentStartDataPart with "data-" prefix
 */
type DataPartKey = keyof DataPartTypeMap;

// Prefixes used to identify different part types in message streams
const DATA_PREFIX = "data-" as const;
const TOOL_PREFIX = "tool-" as const;

/**
 * Hook to retrieve all data parts from the current message thread
 *
 * Extracts all data parts (parts starting with "data-") from the message history.
 * Data parts can be embedded in regular message parts or nested within tool results.
 *
 * @param storeId - The agent store ID to read from (default: "default")
 * @returns Array of all data parts found in messages
 *
 * @example
 * const dataParts = useDataParts();
 * // Returns all data parts like title updates, suggestions, etc.
 */
export function useDataParts(storeId: string = "default") {
  const messages = useAgentStore((state) => state.messages, storeId);

  return useMemo(() => {
    return extractDataPartsFromMessages(messages);
  }, [messages]);
}

/**
 * Hook to retrieve a specific data part with automatic type inference
 *
 * Retrieves the latest data part of the specified type from the message stream.
 * The return type is automatically inferred based on the data part key you provide.
 *
 * @template T - The data part key type (must be a valid DataPartKey)
 * @param dataPartType - The type of data part to retrieve (e.g., "data-agentstart-suggestions")
 * @param storeId - The agent store ID to read from (default: "default")
 * @returns A tuple of [data | null, clearFunction]
 *   - data: The data part payload with correctly inferred type, or null if not found
 *   - clearFunction: Function to remove this data part from the store
 *
 * @example
 * // Automatic type inference - suggestions is { prompts: string[] } | null
 * const [suggestions, clearSuggestions] = useDataPart("data-agentstart-suggestions");
 *
 * if (suggestions) {
 *   console.log(suggestions.suggestions); // TypeScript knows this is string[]
 * }
 *
 * // Clear the data part when done
 * clearSuggestions();
 *
 * @example
 * // Works with title updates too - titleData is { title: string } | null
 * const [titleData] = useDataPart("data-agentstart-title_update");
 */
export function useDataPart<T extends DataPartKey>(
  dataPartType: T,
  storeId: string = "default",
): [DataPartTypeMap[T] | null, () => void] {
  const messages = useAgentStore((state) => state.messages, storeId);
  const dataParts = useAgentStore((state) => state.dataParts, storeId);
  const removeDataPart = useAgentStore(
    (state) => state.removeDataPart,
    storeId,
  );

  // Find the latest data part matching the requested type
  const latestDataPart = useMemo(() => {
    const extractedParts = extractDataPartsFromMessages(messages);

    // Search through extracted message parts for matching type
    let latestMatch: AgentStartDataUIPart | null = null;

    for (const part of extractedParts) {
      if (part.type === dataPartType) {
        if (!latestMatch) {
          latestMatch = part;
        }
        // Note: We keep the first match as messages are in chronological order
        // and we want the most recent (last) occurrence
      }
    }

    // If not found in messages, check the store's data parts
    if (!latestMatch) {
      const storedData = dataParts.get(dataPartType);
      if (storedData !== undefined) {
        latestMatch = {
          type: dataPartType,
          data: storedData,
        } as AgentStartDataUIPart;
      }
    }

    return latestMatch;
  }, [dataParts, dataPartType, messages]);

  // Create a memoized clear function to remove this data part
  const clearDataPart = useCallback(() => {
    removeDataPart(dataPartType as AgentStartDataUIPart["type"]);
  }, [dataPartType, removeDataPart]);

  // Return the data with proper type casting and the clear function
  return [
    latestDataPart
      ? (latestDataPart.data as unknown as DataPartTypeMap[T])
      : null,
    clearDataPart,
  ];
}

/**
 * Extracts all data parts from a list of messages
 *
 * Data parts can be found in two locations:
 * 1. Direct message parts (parts with type starting with "data-")
 * 2. Nested within tool result parts (tool results can contain data parts)
 *
 * @param messages - Array of UI messages to search through
 * @returns Array of all data parts found
 *
 * @internal This is an internal utility function
 */
function extractDataPartsFromMessages(
  messages: UIMessage[],
): AgentStartDataUIPart[] {
  const collectedDataParts: AgentStartDataUIPart[] = [];

  for (const message of messages) {
    // Skip messages without parts
    if (!message.parts || !Array.isArray(message.parts)) {
      continue;
    }

    for (const part of message.parts) {
      // Extract direct data parts
      if (isDataPart(part)) {
        const dataPart = part as AgentStartDataUIPart;
        if (dataPart.data !== undefined) {
          collectedDataParts.push(dataPart);
        }
      }

      // Extract data parts nested within tool results
      if (isToolPartWithResult(part)) {
        const nestedDataParts = extractDataPartsFromToolResult(part.result);
        collectedDataParts.push(...nestedDataParts);
      }
    }
  }

  return collectedDataParts;
}

/**
 * Type guard to check if a part is a data part
 *
 * @param part - The message part to check
 * @returns True if the part is a data part (type starts with "data-")
 */
function isDataPart(part: unknown): part is AgentStartDataUIPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    typeof part.type === "string" &&
    part.type.startsWith(DATA_PREFIX) &&
    "data" in part
  );
}

/**
 * Type guard to check if a part is a tool part with a result
 *
 * @param part - The message part to check
 * @returns True if the part is a tool part with a result property
 */
function isToolPartWithResult(
  part: unknown,
): part is { type: string; result: unknown } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    typeof part.type === "string" &&
    part.type.startsWith(TOOL_PREFIX) &&
    "result" in part &&
    part.result !== null &&
    part.result !== undefined
  );
}

/**
 * Extracts data parts from a tool result object
 *
 * Tool results can contain a "parts" property with nested data parts.
 * This function safely extracts those nested data parts.
 *
 * @param toolResult - The tool result object to search
 * @returns Array of data parts found in the tool result
 */
function extractDataPartsFromToolResult(
  toolResult: unknown,
): AgentStartDataUIPart[] {
  const dataPartsInResult: AgentStartDataUIPart[] = [];

  // Check if result is an object with a parts array
  if (typeof toolResult !== "object" || toolResult === null) {
    return dataPartsInResult;
  }

  if (!("parts" in toolResult)) {
    return dataPartsInResult;
  }

  const parts = (toolResult as { parts?: unknown }).parts;

  if (!Array.isArray(parts)) {
    return dataPartsInResult;
  }

  // Extract valid data parts from the parts array
  for (const nestedPart of parts) {
    if (isDataPart(nestedPart) && nestedPart.data !== undefined) {
      dataPartsInResult.push(nestedPart);
    }
  }

  return dataPartsInResult;
}
