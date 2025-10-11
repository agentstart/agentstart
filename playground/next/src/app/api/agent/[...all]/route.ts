import { toNextJsHandler } from "@agent-stack/core";
import { agentStack } from "@/lib/agent"; // path to your auth file

export const { POST, GET } = toNextJsHandler(agentStack);
