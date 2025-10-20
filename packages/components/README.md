# @agentstart/components

AgentStart’s component kit packages the conversation, tool, and layout primitives we use to wire agent front-ends. The goal is a batteries-included shadcn registry so teams can scaffold an AgentStart UI with a single CLI command.

## Component Footprint

- **36 components ready today**: 24 conversation/AI elements, 9 tool renderers, 2 layout composites, and the AgentStart provider already live under `src/components`.
- **1 planned composite**: the high-level `agent/layout/agent-workspace` shell that snaps everything together.
- Target coverage: a one-command install that yields sidebar navigation, conversation stream, prompt composer, and tool visualisations out of the box.

## Shadcn Registry Setup

1. **Install the package** (workspace dependency so the registry JSON files ship with node_modules):

   ```bash
   pnpm add @agentstart/components
   ```

2. **Expose the AgentStart registry alias** in your app’s `components.json`:

   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "registries": {
       "@agentstart": "./node_modules/@agentstart/components/registry/{name}.json"
     }
   }
   ```

   > The alias points at local files for now; once the CDN is live we will switch the path to `https://registry.agentstart.dev/{name}.json`.

3. **Install components with the shadcn CLI**:

   ```bash
   npx shadcn@latest add prompt-input --registry=@agentstart
   npx shadcn@latest add tools/message-part-view --registry=@agentstart
   ```

4. **Import components from the package export map**:

   ```tsx
   import { PromptInput } from "@agentstart/components/components/ai-elements/prompt-input";
   import { MessagePart } from "@agentstart/components/components/tools/message-part-view";
   ```

## Provide the thread client once

```tsx
import { createAgentClient } from "agentstart/client";
import { AgentStartProvider } from "@agentstart/components/components/agent/provider";
import { Sidebar } from "@agentstart/components/components/agent/sidebar";

const { client } = createAgentClient();

export function AgentShell({ children }: { children: React.ReactNode }) {
  return (
    <AgentStartProvider client={client}>
      <Sidebar>{children}</Sidebar>
    </AgentStartProvider>
  );
}
```

## Example: wiring `PromptInput` to AgentStart

```tsx
import { createAgentClient } from "agentstart/client";
import {
  PromptInput,
  PromptInputAttachments,
} from "@agentstart/components/components/ai-elements/prompt-input";

const { useThread } = createAgentClient();

export function AgentComposer({ threadId }: { threadId: string }) {
  const thread = useThread({ id: threadId });

  return (
    <PromptInput
      maxFiles={4}
      onSubmit={async ({ text, files }) => {
        if (!text && (!files || files.length === 0)) return;
        await thread.sendMessage({
          role: "user",
          content: text ?? "",
          parts: files ?? [],
        });
      }}
    >
      <PromptInputAttachments />
    </PromptInput>
  );
}
```

## Example: composing a thread-first layout

```tsx
import { createAgentClient } from "agentstart/client";
import { SidebarTrigger } from "@agentstart/components/components/ui/sidebar";
import {
  Sidebar,
} from "@agentstart/components/components/agent/sidebar";
import { AgentStartProvider } from "@agentstart/components/components/agent/provider";
import { PromptInput } from "@agentstart/components/components/ai-elements/prompt-input";

const { client, useThread } = createAgentClient();

export function AgentWorkspace({ threadId }: { threadId: string }) {
  const thread = useThread({ id: threadId });

  return (
    <AgentStartProvider client={client}>
      <Sidebar
        selectedThreadId={threadId}
        onSelectThread={(next) => {
          // Navigate with your router of choice
          console.log("go to", next.id);
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <SidebarTrigger />
            <h1 className="font-semibold text-lg">Agent session</h1>
          </header>
          <main className="flex-1 overflow-y-auto">…conversation stream…</main>
          <footer className="border-t p-4">
            <PromptInput
              onSubmit={async ({ text }) => {
                if (!text) return;
                await thread.sendMessage({ role: "user", content: text });
              }}
            />
          </footer>
        </div>
      </Sidebar>
    </AgentStartProvider>
  );
}
```

## Using TanStack Query

**Recommended**: For optimal performance and better user experience, use TanStack Query to fetch threads and manage server state. This approach provides:

- Automatic background refetching
- Optimistic updates
- Request deduplication
- Better caching strategies

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "./lib/orpc"; // Your oRPC utils

export function AgentWorkspace({ threadId }: { threadId: string }) {
  // Use TanStack Query for fetching threads
  const { data: threads } = useSuspenseQuery(
    orpc.thread.list.queryOptions({
      input: { pageSize: 20 },
    })
  );

  return (
    <AgentStartProvider client={client}>
      <Sidebar
        initialThreads={threads} // Pass server data to avoid redundant fetches
        selectedThreadId={threadId}
        onSelectThread={(next) => {
          console.log("go to", next.id);
        }}
      >
        {/* ... */}
      </Sidebar>
    </AgentStartProvider>
  );
}
```

## Roadmap

### Ready for registry (36 components)

- ✅ **Conversation primitives**  
  `agent/actions`, `agent/conversation`, `agent/message`, `agent/response`, `agent/suggestion`, `agent/queue`, `agent/task`
- ✅ **Context & reasoning surfaces**  
  `agent/context`, `agent/plan`, `agent/branch`, `agent/chain-of-thought`, `agent/reasoning`
- ✅ **Reference & output renderers**  
  `agent/artifact`, `agent/code-block`, `agent/web-preview`, `agent/image`, `agent/inline-citation`, `agent/sources`, `agent/commit-hash`, `agent/open-in-chat`
- ✅ **Prompting & attachments**  
  `agent/prompt-input`
- ✅ **Tool chrome**  
  `agent/tool`
- ✅ **System status helpers**  
  `agent/loader`, `agent/shimmer`
- ✅ **Tool result components**  
  `agent/tools/bash`, `agent/tools/glob`, `agent/tools/grep`, `agent/tools/ls`, `agent/tools/message-part-view`, `agent/tools/read`, `agent/tools/todo`, `agent/tools/update`, `agent/tools/write`
- ✅ **Layout scaffolding**
  `agent/sidebar`, `agent/sidebar-item`, `agent/provider`

### Planned additions

- ⏳ `agent/layout/agent-workspace` – high-level layout that composes sidebar, conversation surface, and `PromptInput` for turn-key scaffolding.
- ⏳ **Registry publishing** – ship a build step that emits CDN-ready `{name}.json` files for the shadcn CLI.
