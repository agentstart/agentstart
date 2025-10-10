/* agent-frontmatter:start
AGENT: Adapter debug helpers
PURPOSE: Provide shared debug logging hook for adapters
USAGE: createDebugLoggerHook("prisma")
EXPORTS: createDebugLoggerHook
FEATURES:
  - Handles boolean or custom logger debug options
  - Emits namespaced console output when enabled
SEARCHABLE: adapter debug, logging hook, adapter utilities
agent-frontmatter:end */

import type { AdapterDebugLogger } from "../create-database-adapter";

export type AdapterDebugOption =
  | boolean
  | {
      logger?: AdapterDebugLogger;
    };

/**
 * Normalises debug logging for adapters. Each adapter provides its options
 * object and receives a composite logger that respects global/on-demand
 * debug settings.
 */
export function createDebugLoggerHook<
  TOptions extends {
    debug?: AdapterDebugOption;
  },
>(prefix: string) {
  return ({
    options,
    defaultLogger,
  }: {
    options: TOptions;
    defaultLogger: AdapterDebugLogger;
  }): AdapterDebugLogger => {
    const debugOption = options.debug;
    if (debugOption === true) {
      return (event, payload) => {
        console.debug(`[${prefix}-adapter] ${event}`, payload);
        defaultLogger(event, payload);
      };
    }
    if (typeof debugOption === "object" && debugOption?.logger) {
      const customLogger = debugOption.logger;
      return (event, payload) => {
        customLogger?.(event, payload);
        defaultLogger(event, payload);
      };
    }
    return defaultLogger;
  };
}
