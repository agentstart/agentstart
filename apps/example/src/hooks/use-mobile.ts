/* agent-frontmatter:start
AGENT: Playground hook
PURPOSE: Detects when the viewport falls below the mobile breakpoint.
USAGE: Use within client components to toggle responsive layouts.
EXPORTS: useIsMobile
FEATURES:
  - Listens to matchMedia changes for breakpoint updates
  - Caches mobile state to avoid unnecessary renders
SEARCHABLE: playground, next, src, hooks, use, mobile, hook, responsive
agent-frontmatter:end */

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
