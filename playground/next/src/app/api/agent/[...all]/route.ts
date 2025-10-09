import { toNextJsHandler } from "@agent-stack/core";
import { agent } from "@/lib/agent"; // path to your auth file

export const { POST, GET } = toNextJsHandler(agent);
