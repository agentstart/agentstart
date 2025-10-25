import type {
  Agent,
  GenerateTextResult,
  InferGenerateOutput,
  InferStreamOutput,
  ModelMessage,
  Output,
  Prompt,
  StreamTextResult,
  ToolLoopAgentSettings,
  ToolSet,
} from "ai";
import { generateText, stepCountIs, streamText } from "ai";
import type { RuntimeContext } from "./context";

interface CallOptions {
  runtimeContext: RuntimeContext;
}

export type AgentCallParameters<CALL_OPTIONS> = ([CALL_OPTIONS] extends [never]
  ? { options?: never }
  : { options: CALL_OPTIONS }) &
  (
    | {
        /**
         * A prompt. It can be either a text prompt or a list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        prompt: string | Array<ModelMessage>;

        /**
         * A list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        messages?: never;
      }
    | {
        /**
         * A list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        messages: Array<ModelMessage>;

        /**
         * A prompt. It can be either a text prompt or a list of messages.
         *
         * You can either use `prompt` or `messages` but not both.
         */
        prompt?: never;
      }
  );

/**
 * A tool loop agent is an agent that runs tools in a loop. In each step,
 * it calls the LLM, and if there are tool calls, it executes the tools
 * and calls the LLM again in a new step with the tool results.
 *
 * The loop continues until:
 * - A finish reasoning other than tool-calls is returned, or
 * - A tool that is invoked does not have an execute function, or
 * - A tool call needs approval, or
 * - A stop condition is met (default stop condition is stepCountIs(20))
 */
export class BaseAgent<
  // biome-ignore lint/complexity/noBannedTypes: is fine
  TOOLS extends ToolSet = {},
  OUTPUT extends Output.Output = never,
> implements Agent<CallOptions, TOOLS, OUTPUT>
{
  readonly version = "agent-v1";

  constructor(
    readonly settings: ToolLoopAgentSettings<CallOptions, TOOLS, OUTPUT>,
  ) {
    this.settings = settings;
  }

  /**
   * The id of the agent.
   */
  get id(): string | undefined {
    return this.settings.id;
  }

  /**
   * The tools that the agent can use.
   */
  get tools(): TOOLS {
    return this.settings.tools as TOOLS;
  }

  private async prepareCall(
    options: AgentCallParameters<CallOptions>,
  ): Promise<
    Omit<
      ToolLoopAgentSettings<CallOptions, TOOLS, OUTPUT>,
      "prepareCall" | "instructions"
    > &
      Prompt
  > {
    const baseCallArgs = {
      ...this.settings,
      stopWhen: this.settings.stopWhen ?? stepCountIs(20),
      ...options,
    };

    const preparedCallArgs =
      (await this.settings.prepareCall?.(baseCallArgs)) ?? baseCallArgs;

    const { instructions, messages, prompt, ...callArgs } = preparedCallArgs;

    return {
      ...callArgs,

      // restore prompt types
      ...({ system: instructions, messages, prompt } as Prompt),

      experimental_context: options.options.runtimeContext,
    };
  }

  /**
   * Generates an output from the agent (non-streaming).
   */
  async generate(
    options: AgentCallParameters<CallOptions>,
  ): Promise<GenerateTextResult<TOOLS, InferGenerateOutput<OUTPUT>>> {
    return generateText(await this.prepareCall(options));
  }

  /**
   * Streams an output from the agent (streaming).
   */
  async stream(
    options: AgentCallParameters<CallOptions>,
  ): Promise<StreamTextResult<TOOLS, InferStreamOutput<OUTPUT>>> {
    return streamText(await this.prepareCall(options));
  }
}
