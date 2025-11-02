import type { ModelMessage, UIMessage, UIMessageStreamWriter } from "ai";
import type { MemoryAdapter } from "./memory";
import type { SandboxAPI } from "./sandbox";

export interface RuntimeContext {
  writer: UIMessageStreamWriter<UIMessage>;
  threadId: string;
  sandbox: SandboxAPI;
  memory: MemoryAdapter;
}

export interface CallOptions {
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
  ) & {
    /**
     * An optional abort signal that can be used to cancel an ongoing agent call.
     */
    abortSignal?: AbortSignal;
  };
