import { PromptInput } from "@/components/prompt-input";

export default function Page() {
  return (
    <div className="flex h-screen max-h-screen flex-col space-x-2 overflow-hidden p-2">
      <main className="mx-auto mt-24 min-w-3xl space-y-6">
        <div className="relative">
          <h1 className="text-center font-bold text-4xl">Your idea, live.</h1>
          <PromptInput />
        </div>
      </main>
    </div>
  );
}
