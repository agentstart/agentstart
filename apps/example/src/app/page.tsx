/* agent-frontmatter:start
AGENT: Playground page component
PURPOSE: Renders the introductory landing page with the prompt input.
USAGE: Serves as the default route for the playground experience.
EXPORTS: default
FEATURES:
  - Displays hero messaging and prompt composer
  - Centers content with responsive layout classes
SEARCHABLE: playground, next, src, app, page, landing, prompt
agent-frontmatter:end */

import { PromptInput } from "@/components/agent/prompt-input";

export default function Page() {
  return (
    <div className="flex h-screen max-h-screen flex-col space-x-2 overflow-hidden p-2">
      <main className="mx-auto mt-48 min-w-3xl">
        <div className="relative space-y-8">
          <h1 className="text-center font-serif text-4xl">
            What can I do for you?
          </h1>

          <PromptInput />
        </div>
      </main>
    </div>
  );
}
