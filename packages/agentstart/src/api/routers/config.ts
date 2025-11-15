/* agent-frontmatter:start
AGENT: Config router using oRPC
PURPOSE: Expose application configuration endpoints
USAGE: config.get() to fetch all application configuration
EXPORTS: configRouter, createConfigRouter
FEATURES:
  - Returns comprehensive application configuration
  - Exposes app name, welcome config, models, navigation mode, blob config, and more
  - Provides centralized config access for frontend components
  - Supports dynamic middleware via procedure builder
SEARCHABLE: config router, app config, agent config api, application settings
agent-frontmatter:end */

import { getBlob } from "@agentstart/blob";
import { z } from "zod";
import { publicProcedure } from "@/api/procedures";
import { handleRouterError } from "@/api/utils/error-handler";

// Helper function to safely extract model ID from LanguageModel
function getModelId(model: unknown): string {
  if (typeof model === "object" && model !== null) {
    const obj = model;
    // Try common property names
    if ("modelId" in obj && typeof obj.modelId === "string") {
      return obj.modelId;
    }
    if ("model" in obj && typeof obj.model === "string") {
      return obj.model;
    }
  }
  return "unknown";
}

const welcomeConfigSchema = z.object({
  enabled: z.boolean(),
  description: z.string().nullable(),
  suggestions: z.array(z.string()).nullable(),
});

const logoConfigSchema = z
  .union([
    z.string(),
    z.object({
      src: z.string(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ])
  .nullable();

const modelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
});

const blobConstraintsSchema = z.object({
  maxFileSize: z.number().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  maxFiles: z.number().optional(),
  uploadTiming: z.enum(["onSubmit", "immediate"]).optional(),
});

const providerEnum = z.enum(["vercelBlob", "awsS3", "cloudflareR2"]);

const blobConfigSchema = z.object({
  enabled: z.boolean(),
  constraints: blobConstraintsSchema.nullable(),
  provider: providerEnum.nullable(),
});

const appConfigSchema = z.object({
  appName: z.string().nullable(),
  logo: logoConfigSchema,
  baseURL: z.string().nullable(),
  welcome: welcomeConfigSchema,
  models: z
    .object({
      default: z.string().nullable(),
      available: z.array(modelInfoSchema),
    })
    .nullable(),
  blob: blobConfigSchema,
});

/**
 * Create config router with optional custom procedure builder
 */
export function createConfigRouter(procedure = publicProcedure) {
  return {
    get: procedure
      .meta({
        doc: {
          summary: "Get application configuration",
          description:
            "Returns comprehensive application configuration including app name, welcome settings, available models, and other frontend-relevant settings.",
          examples: [
            {
              title: "Fetch all config",
              code: "const config = await start.api.config.get();\nconsole.log(config.appName);\nconsole.log(config.welcome);\nconsole.log(config.models);",
            },
          ],
        },
      })
      .output(appConfigSchema)
      .handler(async ({ context, errors }) => {
        try {
          // Context extends AgentStartOptions
          const welcome = context.welcome;
          const logo = context.logo;

          // Extract model information
          const modelsConfig = context.models;
          let defaultModelId = null;
          let availableModels: Array<{
            id: string;
            name: string;
            provider: string;
          }> = [];

          // Extract default model ID using helper function
          if (modelsConfig?.default) {
            defaultModelId = getModelId(modelsConfig.default);
          }

          // Extract available models with parsed id, name, and provider
          if (
            modelsConfig?.available &&
            Array.isArray(modelsConfig.available)
          ) {
            availableModels = modelsConfig.available.map((m) => {
              const modelId = getModelId(m);

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
            });
          }

          // Extract blob configuration
          const adapter = await getBlob(context);
          const blobConfig = {
            enabled: Boolean(adapter),
            constraints: adapter?.getConstraints() ?? null,
            provider: adapter?.provider ?? null,
          };

          return {
            appName: context.appName ?? null,
            logo: logo ?? null,
            baseURL: context.baseURL ?? null,
            welcome: {
              enabled: Boolean(welcome),
              description: welcome?.description ?? null,
              suggestions: welcome?.suggestions ?? null,
            },
            models: modelsConfig
              ? {
                  default: defaultModelId,
                  available: availableModels,
                }
              : null,
            blob: blobConfig,
          };
        } catch (error) {
          console.error("Error fetching app config:", error);
          handleRouterError(error, errors);
        }
      }),
  };
}

// Type exports for client-side usage
export type AppConfig = z.infer<typeof appConfigSchema>;
