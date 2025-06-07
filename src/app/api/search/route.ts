import { NextResponse } from "next/server";

async function tryPages(baseUrl: string, paths: string[]) {
  for (const path of paths) {
    try {
      const fullUrl = `${baseUrl.replace(/\/$/, "")}${path}`;
      const res = await fetch(fullUrl, { cache: "no-store" });
      if (res.ok) {
        const html = await res.text();
        return { html, url: fullUrl };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function extractSummary(html: string): string {
  const cleanText = html
    .replace(/\s+/g, " ")
    .match(/<p[^>]*>(.*?)<\/p>/gi)
    ?.map((p) => p.replace(/<[^>]+>/g, "").trim())
    .filter((p) => p.length > 40 && p.length < 300) ?? [];

  return cleanText[0] || "No values summary found.";
}

async function getNews(company: string): Promise<{ title: string; link: string }[]> {
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(company)}&lang=en&max=5&token=${process.env.GNEWS_API_KEY}`
    );
    const json = await res.json();
    return json.articles?.map((a: any) => ({
      title: a.title,
      link: a.url,
    })) ?? [];
  } catch (err) {
    console.error("News fetch failed:", err);
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");

  if (!company) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 });
  }

  const baseUrl = `https://${company.toLowerCase().replace(/\s+/g, "")}.com`;
  const result = await tryPages(baseUrl, ["/", "/about", "/en", "/home", "/index.html"]);

  const news = await getNews(company); // ✅ always fetch news

  if (!result) {
    console.log("No homepage found for:", company);
    const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(company)}+official+site`;
    return NextResponse.json({
      url: fallbackUrl,
      summary: "No values summary found.",
      news,
    });
  }

  const summary = extractSummary(result.html);
  console.log("News results:", news);

  return NextResponse.json({
    url: result.url,
    summary,
    news,
  });
}
