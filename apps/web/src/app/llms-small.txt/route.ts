import { source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const content: string[] = [];

  // Add header
  content.push("# AgentStart Documentation (Concise)\n");
  content.push(
    "A batteries-included framework for building production-ready AI agents.\n",
  );
  content.push("GitHub: https://github.com/agentstart/agentstart\n");
  content.push("\n---\n\n");

  // Get all pages across all languages
  for (const lang of ["en", "cn"]) {
    const pages = source.getPages(lang);

    content.push(`\n## Language: ${lang === "en" ? "English" : "中文"}\n\n`);

    for (const page of pages) {
      if (!page.url) continue;

      // Only include title, description, and URL for concise version
      content.push(`## ${page.data.title}`);
      if (page.data.description) {
        content.push(page.data.description);
      }
      content.push(`URL: ${page.url}\n`);
    }
  }

  return new Response(content.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
