import Link from "next/link";

export const FooterSection = () => {
  return (
    <footer className="relative border-t">
      {/* Links Section */}
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Logo and Description */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg font-bold">AgentStack</span>
            </div>
            <p className="text-muted-foreground text-sm">
              The first fullstack template built for AI agents, not humans. Zero
              config, maximum efficiency, true vibe coding.
            </p>
          </div>

          {/* Features Links */}
          <div>
            <h3 className="mb-4 font-semibold">Features</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  AI-First Architecture
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Token Efficient
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Smart Errors
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  AGENTS.md
                </Link>
              </li>
            </ul>
          </div>

          {/* Built-in */}
          <div>
            <h3 className="mb-4 font-semibold">Built-in</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Authentication
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Payments
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Database
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  AI SDK
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="mb-4 font-semibold">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="https://github.com"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/examples"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Examples
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
