// AGENT: Mobile detection hook
// PURPOSE: Detect if current viewport is mobile size
// USAGE: const isMobile = useIsMobile()
// RETURNS: true if viewport width < 768px, false otherwise
// FEATURES: Responsive to window resize events
// SEARCHABLE: mobile detection, responsive hook, viewport size

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// AGENT: Hook to detect mobile viewport
// CUSTOMIZATION: Change MOBILE_BREAKPOINT to adjust threshold
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
