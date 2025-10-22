/* agent-frontmatter:start
AGENT: Agent client state helper
PURPOSE: Maps streamed data parts into React Query state updates for the client dashboard.
USAGE: Invoke after receiving agent data events to invalidate or refetch client caches.
EXPORTS: useDataStateMapper
FEATURES:
  - Bridges ORPC query utilities with TanStack Query cache
  - Keeps mission and thread metadata synchronized after updates
SEARCHABLE: packages, agentstart, src, client, data, state, mapper, tanstack
agent-frontmatter:end */

import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { useQueryClient } from "@tanstack/react-query";
import type { DataUIPart } from "ai";
import type { AgentStartDataPart } from "@/agent";
import type { AgentStartAPI } from "@/api";

export function useDataStateMapper(client: AgentStartAPI) {
  const queryClient = useQueryClient();
  return (data: DataUIPart<AgentStartDataPart>) => {
    const orpc = createTanstackQueryUtils(client);
    switch (data.type) {
      case "data-agentstart-title_update": {
        queryClient.invalidateQueries(orpc.thread.list.queryOptions());
        break;
      }
      default:
        break;
    }
  };
}
