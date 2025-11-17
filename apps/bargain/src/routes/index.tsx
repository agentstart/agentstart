/* agent-frontmatter:start
AGENT: Homepage component
PURPOSE: Renders landing page with welcome message and prompt input
USAGE: Serves as the default route
EXPORTS: default
FEATURES:
  - Shows welcome page with prompt input
  - Creates thread on message submission
SEARCHABLE: playground, next, src, app, page, landing, chat
agent-frontmatter:end */

import { createFileRoute } from "@tanstack/react-router";
import { PromptInput } from "@/components/agent/prompt-input";
import { WelcomeMessage } from "@/components/agent/welcome-message";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="mx-auto flex h-full w-full max-w-full flex-1 flex-col">
          <div className="relative mx-auto flex size-full w-full flex-col overflow-y-auto px-4 pb-48 sm:min-w-[390px] sm:max-w-3xl">
            <img
              className="my-8 block h-auto w-full"
              src="https://cdn.guijia.store/assets/banner.png"
              alt="banner"
            />
            <WelcomeMessage />
          </div>

          <div className="sticky inset-x-0 bottom-0 pb-4">
            <PromptInput className="mx-auto" layout="mobile" />
          </div>
        </div>
      </div>
    </div>
  );
}
