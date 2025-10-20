import { toNextJsHandler } from "agentstart/integration";
import { start } from "@/lib/agent"; // path to your auth file

export const { POST, GET } = toNextJsHandler(start.handler);
