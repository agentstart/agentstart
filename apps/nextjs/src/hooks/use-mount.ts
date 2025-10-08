/* agent-frontmatter:start
AGENT: Mount detection hook
PURPOSE: Detect if component is mounted (client-side)
USAGE: const isMounted = useMount()
RETURNS: true if mounted, false otherwise
FEATURES: Prevents hydration mismatches
SEARCHABLE: mount detection, client-side hook, hydration
agent-frontmatter:end */

import * as React from "react";

export function useMount() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
