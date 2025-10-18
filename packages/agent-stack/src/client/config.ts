/* agent-frontmatter:start
AGENT: Agent client configuration helpers
PURPOSE: Resolve base URLs for client-side agent calls
USAGE: getClientConfig({ baseURL, basePath }, loadEnv)
EXPORTS: AgentClientConfig, getClientConfig
FEATURES:
  - Computes default API base URL when none provided
  - Supports opt-in environment variable loading
SEARCHABLE: client config, agent client, base url
agent-frontmatter:end */

import { getBaseURL } from "@agent-stack/utils";

export interface AgentClientConfig {
  baseURL?: string;
  basePath?: string;
}

export const getClientConfig = (
  config?: AgentClientConfig,
  loadEnv?: boolean,
) => {
  const baseURL =
    getBaseURL(config?.baseURL, config?.basePath, undefined, loadEnv) ??
    "/api/agent";

  return {
    get baseURL() {
      return baseURL;
    },
  };
};
