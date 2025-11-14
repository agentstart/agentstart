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
    <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
      <h1 className="text-base">和归家十二分砍价守门员聊聊</h1>
    </header>
  );
}
