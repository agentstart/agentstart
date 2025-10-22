/* agent-frontmatter:start
AGENT: Agent runtime tool helper
PURPOSE: Transforms thrown errors into structured payloads consumable by the agent runtime.
USAGE: Use when surfacing tool failures back to the LLM with additional context.
EXPORTS: getRichError
FEATURES:
  - Extracts safe error message fields for model consumption
  - Appends serialized parameters to aid debugging
SEARCHABLE: packages, agentstart, src, agent, tools, get, rich, error, tooling, metadata
agent-frontmatter:end */

interface Params {
  args?: Record<string, unknown>;
  action: string;
  error: unknown;
}

/**
 * Allows to parse a thrown error to check its metadata and construct a rich
 * message that can be handed to the LLM.
 */
export function getRichError({ action, args, error }: Params) {
  const fields = getErrorFields(error);
  let message = `Error during ${action}: ${fields.message}`;
  if (args) message += `\nParameters: ${JSON.stringify(args, null, 2)}`;
  return {
    message: message,
    error: fields,
  };
}

function getErrorFields(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
    };
  } else {
    return {
      message: error.message,
    };
  }
}
