import { toNextJsHandler } from "agent-stack";
import { agentStack } from "@/lib/agent"; // path to your auth file

export const { POST, GET } = toNextJsHandler(agentStack);
