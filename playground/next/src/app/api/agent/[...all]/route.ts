import { toNextJsHandler } from "agentstart";
import { agentStart } from "@/lib/agent"; // path to your auth file

export const { POST, GET } = toNextJsHandler(agentStart);
