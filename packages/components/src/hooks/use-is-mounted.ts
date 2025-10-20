/* agent-frontmatter:start
AGENT: useIsMounted hook
PURPOSE: Track component mount status to prevent state updates after unmount
USAGE: const isMounted = useIsMounted()
EXPORTS: useIsMounted
FEATURES:
  - Returns a function that checks if component is still mounted
  - Prevents memory leaks from async operations
  - Safe for use in effects and callbacks
SEARCHABLE: mounted, unmounted, component lifecycle, memory leak prevention
agent-frontmatter:end */

"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Hook that tracks whether the component is currently mounted.
 * Returns a function that can be called to check mount status.
 *
 * Useful for preventing state updates after component unmount,
 * especially in async operations and callbacks.
 *
 * @example
 * ```tsx
 * const isMounted = useIsMounted();
 *
 * useEffect(() => {
 *   fetchData().then((data) => {
 *     if (isMounted()) {
 *       setData(data);
 *     }
 *   });
 * }, []);
 * ```
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}
