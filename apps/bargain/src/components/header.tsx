/* agent-frontmatter:start
AGENT: Bargain header component
PURPOSE: Display bargain app header
USAGE: <Header />
EXPORTS: Header
FEATURES:
  - Static header text for bargain app
  - Responsive layout
SEARCHABLE: bargain header, header component
agent-frontmatter:end */

"use client";

export function Header() {
  return (
    <header className="flex items-center justify-between gap-1 border-b bg-background px-6 py-3">
      <h1 className="font-semibold text-base">来和归家十二分砍价守门员聊聊</h1>
    </header>
  );
}
