import { generate as DefaultImage } from "fumadocs-ui/og";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { getPageImage, source } from "@/lib/source";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  // Last segment is 'image.png', remove it to get the actual page slug
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      site="AgentStart"
    />,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  const params: { slug: string[] }[] = [];

  for (const lang of ["en", "cn"]) {
    const pages = source.getPages(lang);
    for (const page of pages) {
      params.push({
        slug: getPageImage(page).segments,
      });
    }
  }

  return params;
}
