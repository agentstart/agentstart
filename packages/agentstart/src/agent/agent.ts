/* agent-frontmatter:start
AGENT: AI SDK v6 Agent implementation
PURPOSE: Implement AI SDK Agent interface with tool loop execution support
USAGE: new BaseAgent({ settings, tools, instructions })
EXPORTS: BaseAgent, AgentCallParameters
FEATURES:
  - Implements AI SDK v6 Agent protocol
  - Supports tool loop execution with configurable stop conditions
  - Provides runtime context injection for call options
  - Exposes agent ID and tools via getters
SEARCHABLE: base agent, ai sdk agent, tool loop agent, agent v6
agent-frontmatter:end */

import type { AgentCallParameters, CallOptions } from "@agentstart/types";
import type {
  Agent,
  GenerateTextResult,
  InferGenerateOutput,
  InferStreamOutput,
  Output,
  Prompt,
  StreamTextResult,
  ToolLoopAgentSettings,
  ToolSet,
} from "ai";
import { generateText, stepCountIs, streamText } from "ai";

/**
 * BaseAgent provides the foundational implementation for AI SDK v6 Agent protocol.
 * It orchestrates tool loop execution, managing the iterative cycle of LLM calls
 * and tool invocations until completion criteria are met.
 *
 * Architecture:
 * - Implements the AI SDK Agent<CallOptions, TOOLS, OUTPUT> interface
 * - Wraps streamText/generateText with tool loop coordination
 * - Injects runtime context (db, sandbox, writer) into each tool execution
 * - Supports custom stop conditions via stopWhen (defaults to 20 steps)
 *
 * Tool Loop Lifecycle:
 * 1. Call LLM with messages and available tools
 * 2. If tool calls are returned, execute each tool with runtime context
 * 3. Append tool results to message history
 * 4. Repeat from step 1 until stop condition is met:
 *    - Non tool-call finish reason (e.g., 'stop', 'length')
 *    - Tool without execute function encountered
 *    - Tool requiring approval is called
 *    - Maximum step count reached (configurable)
 *
 * This class serves as the base for specialized agent implementations
 * and should not be confused with higher-level orchestrators like Run.
 *
 * @template TOOLS - Tool definitions available to the agent
 * @template OUTPUT - Structured output schema (when using output mode)
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
