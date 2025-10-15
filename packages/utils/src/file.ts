import type { BundledLanguage } from "shiki";

export function getFileExtension(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext || "text";
}

export function getLanguage(extension: string): BundledLanguage {
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    go: "go",
    rs: "rust",
    kt: "kotlin",
    swift: "swift",
    m: "objectivec",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    ps1: "powershell",
    r: "r",
    sql: "sql",
    html: "html",
    xml: "xml",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    md: "markdown",
    tex: "latex",
    vue: "vue",
    svelte: "svelte",
  };
  return (langMap[extension] as BundledLanguage) || "bash";
}

export function getLanguageFromFilePath(filePath?: string): BundledLanguage {
  if (!filePath) return "bash";
  return getLanguage(getFileExtension(filePath));
}
