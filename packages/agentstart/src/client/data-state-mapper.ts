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
