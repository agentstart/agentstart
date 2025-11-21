"use client";

import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CodeBlock } from "@/components/agent/code-block";
import { Button } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import { rainbowButtonVariants } from "@/components/ui/rainbow-button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const PACKAGE_NAME = "agentstart";
const GITHUB_URL = "https://github.com/agentstart/agentstart";
const NPM_URL = "https://www.npmjs.com/package/agentstart";

const CODE_TABS = [
  {
    id: "server",
    label: "agent.ts",
    code: `import { agentStart } from "agentstart";
import { Agent, agentTools } from "agentstart/agent";
import { drizzleMemoryAdapter } from "agentstart/memory";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const start = agentStart({
  agent,
  memory: drizzleMemoryAdapter(db, { provider: "postgresql", schema }),
  appName: "my-app",
});

const openrouter = createOpenRouter({
  apiKey: process.env.MODEL_PROVIDER_API_KEY!,
});

const agent = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions: "You are a helpful assistant.",
  tools: { ...agentTools },
});
`,
  },
  {
    id: "client",
    label: "agent-client.ts",
    code: `import {
  createAgentClient,
  useAgentStore,
  useThreadStore,
} from "agentstart/client";
export const { client, useThread } = createAgentClient();

export { useAgentStore, useThreadStore };`,
  },
] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden pt-12 pb-12 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40">
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left Column */}
          <div className="flex flex-col items-start space-y-10 text-left">
            <h1 className="mb-8 max-w-2xl font-medium font-serif text-5xl text-foreground leading-[1.1] tracking-tight">
              <span className="text-muted-foreground/50">
                Batteries-included TypeScript framework for production-ready{" "}
              </span>
              AI agents
            </h1>

            <div className="relative flex w-full items-center gap-3 rounded-lg border bg-background px-5 py-2">
              <CaretRightIcon className="size-4 text-[#c9b0ff]" weight="bold" />

              <p className="font-mono text-muted-foreground text-sm">
                npm i <span className="text-[#c9b0ff]">{PACKAGE_NAME}</span>
              </p>

              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  render={
                    <Link href={NPM_URL} target="_blank" rel="noreferrer">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 128 128"
                      >
                        <path
                          fill="#cb3837"
                          d="M0 7.062C0 3.225 3.225 0 7.062 0h113.88c3.838 0 7.063 3.225 7.063 7.062v113.88c0 3.838-3.225 7.063-7.063 7.063H7.062c-3.837 0-7.062-3.225-7.062-7.063zm23.69 97.518h40.395l.05-58.532h19.494l-.05 58.581h19.543l.05-78.075l-78.075-.1l-.1 78.126z"
                        ></path>
                        <path
                          fill="#fff"
                          d="M25.105 65.52V26.512H40.96c8.72 0 26.274.034 39.008.075l23.153.075v77.866H83.645v-58.54H64.057v58.54H25.105z"
                        ></path>
                      </svg>
                    </Link>
                  }
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  render={
                    <Link href={GITHUB_URL} target="_blank" rel="noreferrer">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 256 256"
                      >
                        <g fill="none">
                          <rect
                            width="256"
                            height="256"
                            fill="#242938"
                            rx="60"
                          ></rect>
                          <path
                            fill="#fff"
                            d="M128.001 30C72.779 30 28 74.77 28 130.001c0 44.183 28.653 81.667 68.387 94.89c4.997.926 6.832-2.169 6.832-4.81c0-2.385-.093-10.262-.136-18.618c-27.82 6.049-33.69-11.799-33.69-11.799c-4.55-11.559-11.104-14.632-11.104-14.632c-9.073-6.207.684-6.079.684-6.079c10.042.705 15.33 10.305 15.33 10.305c8.919 15.288 23.394 10.868 29.1 8.313c.898-6.464 3.489-10.875 6.349-13.372c-22.211-2.529-45.56-11.104-45.56-49.421c0-10.918 3.906-19.839 10.303-26.842c-1.039-2.519-4.462-12.69.968-26.464c0 0 8.398-2.687 27.508 10.25c7.977-2.215 16.531-3.326 25.03-3.364c8.498.038 17.06 1.149 25.051 3.365c19.087-12.939 27.473-10.25 27.473-10.25c5.443 13.773 2.019 23.945.98 26.463c6.412 7.003 10.292 15.924 10.292 26.842c0 38.409-23.394 46.866-45.662 49.341c3.587 3.104 6.783 9.189 6.783 18.519c0 13.38-.116 24.149-.116 27.443c0 2.661 1.8 5.779 6.869 4.797C199.383 211.64 228 174.169 228 130.001C228 74.771 183.227 30 128.001 30M65.454 172.453c-.22.497-1.002.646-1.714.305c-.726-.326-1.133-1.004-.898-1.502c.215-.512.999-.654 1.722-.311c.727.326 1.141 1.01.89 1.508m4.919 4.389c-.477.443-1.41.237-2.042-.462c-.654-.697-.777-1.629-.293-2.078c.491-.442 1.396-.235 2.051.462c.654.706.782 1.631.284 2.078m3.374 5.616c-.613.426-1.615.027-2.234-.863c-.613-.889-.613-1.955.013-2.383c.621-.427 1.608-.043 2.236.84c.611.904.611 1.971-.015 2.406m5.707 6.504c-.548.604-1.715.442-2.57-.383c-.874-.806-1.118-1.95-.568-2.555c.555-.606 1.729-.435 2.59.383c.868.804 1.133 1.957.548 2.555m7.376 2.195c-.242.784-1.366 1.14-2.499.807c-1.13-.343-1.871-1.26-1.642-2.052c.235-.788 1.364-1.159 2.505-.803c1.13.341 1.871 1.252 1.636 2.048m8.394.932c.028.824-.932 1.508-2.121 1.523c-1.196.027-2.163-.641-2.176-1.452c0-.833.939-1.51 2.134-1.53c1.19-.023 2.163.639 2.163 1.459m8.246-.316c.143.804-.683 1.631-1.864 1.851c-1.161.212-2.236-.285-2.383-1.083c-.144-.825.697-1.651 1.856-1.865c1.183-.205 2.241.279 2.391 1.097"
                          ></path>
                        </g>
                      </svg>
                    </Link>
                  }
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <Link href="/docs" className={cn(rainbowButtonVariants())}>
                GET STARTED
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <Frame className="mt-16 w-full lg:mt-0 dark:bg-muted/50">
            <Tabs defaultValue={CODE_TABS[0].id}>
              <div className="flex justify-end px-1 pt-1">
                <TabsList>
                  {CODE_TABS.map((tab) => {
                    return (
                      <TabsTab key={tab.id} value={tab.id}>
                        {tab.label}
                      </TabsTab>
                    );
                  })}
                </TabsList>
              </div>
              <FramePanel className="overflow-hidden p-0!">
                {CODE_TABS.map((tab) => {
                  return (
                    <TabsPanel key={tab.id} value={tab.id}>
                      <div className="bg-background py-3">
                        <CodeBlock
                          className="h-[170px] border-none"
                          code={tab.code}
                          language="typescript"
                        />
                      </div>
                    </TabsPanel>
                  );
                })}
              </FramePanel>
            </Tabs>
          </Frame>
        </div>
      </div>
    </section>
  );
}
