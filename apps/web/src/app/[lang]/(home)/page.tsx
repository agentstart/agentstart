import Link from "fumadocs-core/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center">
      <h1 className="mb-4 font-bold text-2xl">AgentStart</h1>
      <p className="text-fd-muted-foreground">
        A batteries-included framework for building production-ready AI agents
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/docs"
          className="inline-flex items-center justify-center rounded-md bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground text-sm transition-colors hover:bg-fd-primary/90"
        >
          Get Started
        </Link>
        <Link
          href="https://github.com/agentstart/agentstart"
          className="inline-flex items-center justify-center rounded-md border border-fd-border px-6 py-3 font-medium text-sm transition-colors hover:bg-fd-accent"
        >
          View on GitHub
        </Link>
      </div>
    </main>
  );
}
