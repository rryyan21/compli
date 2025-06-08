import { NextRequest, NextResponse } from "next/server";

// Environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CSE_ID = process.env.GOOGLE_CSE_ID;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

// Adds timeout support to fetch
async function fetchWithTimeout(resource: string, options: any = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    console.error("Fetch timeout or error:", err);
    throw err;
  }
}

async function tryPages(baseUrl: string, paths: string[]) {
  for (const path of paths) {
    try {
      const fullUrl = `${baseUrl.replace(/\/$/, "")}${path}`;
      const res = await fetchWithTimeout(fullUrl, { cache: "no-store" }, 8000);
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
    const res = await fetchWithTimeout(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(company)}&lang=en&max=5&token=${GNEWS_API_KEY}`,
      {},
      8000
    );
    const json = await res.json();
    const articles: { title: string; link: string }[] = json.articles?.map((a: any) => ({
      title: a.title,
      link: a.url,
    })) ?? [];

    // Deduplicate articles by title (case-insensitive)
    const seen = new Set<string>();
    const uniqueArticles = articles.filter((article: { title: string; link: string }) => {
      const key = article.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueArticles;
  } catch (err) {
    console.error("News fetch failed:", err);
    return [];
  }
}

async function fetchLinkedInProfiles(company: string) {
  if (!GOOGLE_API_KEY || !CSE_ID) {
    console.warn("Google Custom Search API not configured");
    return [];
  }

  try {
    // Search for LinkedIn profiles mentioning the company
    const query = `site:linkedin.com/in/ "${company}" OR "${company} employee" OR "works at ${company}"`;
    const url = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(
      query
    )}&key=${GOOGLE_API_KEY}&cx=${CSE_ID}&num=10`;
    
    const res = await fetchWithTimeout(url, { cache: "no-store" }, 8000);
    
    if (!res.ok) {
      console.error("Google Custom Search API error:", res.status, res.statusText);
      return [];
    }
    
    const data = await res.json();
    
    if (!data.items) {
      console.log("No LinkedIn profiles found for:", company);
      return [];
    }

    return data.items.map((item: any) => ({
      name: item.title?.replace(" | LinkedIn", "").replace(" - LinkedIn", "") || "Unknown",
      link: item.link,
      description: item.snippet || "",
      position: extractPositionFromSnippet(item.snippet || ""),
    })).slice(0, 8); // Limit to 8 profiles
    
  } catch (error) {
    console.error("LinkedIn profile fetch failed:", error);
    return [];
  }
}

function extractPositionFromSnippet(snippet: string): string {
  // Try to extract job title/position from the snippet
  const patterns = [
    /at\s+([^·]+)(?:·|$)/i,
    /\|\s*([^·]+?)(?:\s*at\s+|\s*·|$)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+at\s+/i,
  ];
  
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return "";
}

// Keep GET method for backward compatibility, but enhance it
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");

  if (!company) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 });
  }

  const baseUrl = `https://${company.toLowerCase().replace(/\s+/g, "")}.com`;
  let result = null;

  try {
    result = await tryPages(baseUrl, ["/", "/about", "/en", "/home", "/index.html"]);
  } catch (err) {
    console.error("Page fetch completely failed:", err);
  }

  // Fetch news and LinkedIn profiles in parallel
  const [news, linkedInProfiles] = await Promise.all([
    getNews(company),
    fetchLinkedInProfiles(company)
  ]);

  if (!result) {
    console.log("No homepage found for:", company);
    const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(company)}+official+site`;
    return NextResponse.json({
      url: fallbackUrl,
      summary: "No values summary found.",
      news,
      contacts: linkedInProfiles,
    });
  }

  const summary = extractSummary(result.html);
  console.log("News results:", news.length, "LinkedIn profiles:", linkedInProfiles.length);

  return NextResponse.json({
    url: result.url,
    summary,
    news,
    contacts: linkedInProfiles,
  });
}

// Add POST method for more complex requests
export async function POST(req: NextRequest) {
  try {
    const { company, includeContacts = true, maxContacts = 8 } = await req.json();
    
    if (!company) {
      return NextResponse.json({ error: "Missing company name" }, { status: 400 });
    }

    const baseUrl = `https://${company.toLowerCase().replace(/\s+/g, "")}.com`;
    let result = null;

    try {
      result = await tryPages(baseUrl, ["/", "/about", "/en", "/home", "/index.html"]);
    } catch (err) {
      console.error("Page fetch completely failed:", err);
    }

    // Conditionally fetch LinkedIn profiles based on request
    const promises = [
      getNews(company),
      ...(includeContacts ? [fetchLinkedInProfiles(company)] : [])
    ];

    const [news, linkedInProfiles = []] = await Promise.all(promises);

    if (!result) {
      console.log("No homepage found for:", company);
      const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(company)}+official+site`;
      return NextResponse.json({
        url: fallbackUrl,
        summary: "No values summary found.",
        news,
        ...(includeContacts && { contacts: linkedInProfiles.slice(0, maxContacts) }),
      });
    }

    const summary = extractSummary(result.html);

    return NextResponse.json({
      url: result.url,
      summary,
      news,
      ...(includeContacts && { contacts: linkedInProfiles.slice(0, maxContacts) }),
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}