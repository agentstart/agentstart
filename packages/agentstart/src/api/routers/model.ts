/* agent-frontmatter:start
AGENT: Model router using oRPC
PURPOSE: Expose available models configuration
USAGE: model.list() to fetch available models
EXPORTS: createModelRouter
FEATURES:
  - Returns list of available models from configuration
  - Provides model info (id, name, provider)
  - Enables dynamic model selection in UI
  - Supports dynamic middleware via procedure builder
SEARCHABLE: model router, model list, model selector api, available models
agent-frontmatter:end */

import z from "zod";
import { publicProcedure } from "@/api/procedures";
import { handleRouterError } from "@/api/utils/error-handler";

const modelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
});

/**
 * Create model router with optional custom procedure builder
 */
export function createModelRouter(procedure = publicProcedure) {
  return {
    list: procedure
      .meta({
        doc: {
          summary: "List available models",
          description:
            "Returns the list of models configured in the models.available array, allowing clients to present a model selector UI.",
          examples: [
            {
              title: "Fetch available models",
              code: "const models = await start.api.model.list();",
            },
          ],
        },
      })
      .output(
        z.object({
          models: z.array(modelInfoSchema),
          defaultModelId: z.string().nullable(),
        }),
      )
      .handler(
        async ({
          context,
          errors,
        }): Promise<{
          models: Array<{ id: string; name: string; provider: string }>;
          defaultModelId: string | null;
        }> => {
          try {
            const modelsConfig = context.models;

            if (!modelsConfig) {
              return {
                models: [],
                defaultModelId: null,
              };
            }

            const models =
              modelsConfig.available?.map((model) => {
                const modelId =
                  typeof model === "string" ? model : model.modelId;
                // Extract provider from modelId (e.g., "openai/gpt-4" -> "openai")
                const provider = modelId.includes("/")
                  ? (modelId.split("/")[0] ?? "unknown")
                  : "unknown";
                // Extract name from modelId (e.g., "openai/gpt-4" -> "gpt-4")
                const name = modelId.includes("/")
                  ? (modelId.split("/")[1] ?? modelId)
                  : modelId;

                return {
                  id: modelId,
                  name: name,
                  provider: provider,
                };
              }) ?? [];

            // Extract default model ID from the default model instance
            const defaultModel = modelsConfig.default;
            const defaultModelId =
              typeof defaultModel === "string"
                ? defaultModel
                : (defaultModel?.modelId ?? null);

            return {
              models,
              defaultModelId,
            };
          } catch (error) {
            console.error("Error fetching models:", error);
            handleRouterError(error, errors);
          }
        },
      ),
  };
}
