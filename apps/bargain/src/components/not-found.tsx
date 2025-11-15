/* agent-frontmatter:start
AGENT: Router not found component
PURPOSE: Render a friendly fallback UI for unknown routes in the bargain app.
USAGE: Assigned via router.defaultNotFoundComponent to catch 404 states.
EXPORTS: NotFound
FEATURES:
  - Presents localized copy that matches the bargaining tone
  - Provides a clear action to navigate back to the main chat
SEARCHABLE: not found, 404, router fallback, bargain app
agent-frontmatter:end */

export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="space-y-2">
        <p className="font-semibold text-2xl">哎呀，守门员没找到这个房间</p>
        <p className="text-muted-foreground">
          链接可能写错了，或者这个对话已经结束了。
        </p>
      </div>
      <a
        className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
        href="/"
      >
        回到活动首页
      </a>
    </main>
  );
}
