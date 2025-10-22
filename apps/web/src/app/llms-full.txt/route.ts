import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const content: string[] = [];

  // Add header
  content.push("# AgentStart Documentation (Full)\n");
  content.push("Complete documentation for AgentStart framework.\n");
  content.push("GitHub: https://github.com/agentstart/agentstart\n");
  content.push("\n---\n\n");

  // Get all pages across all languages
  for (const lang of ["en", "cn"]) {
    const pages = source.getPages(lang);

    content.push(`\n## Language: ${lang === "en" ? "English" : "中文"}\n\n`);

    for (const page of pages) {
      content.push(await getLLMText(page));
    }
  }

  return new Response(content.join("\n\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
