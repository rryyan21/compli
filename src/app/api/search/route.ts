import { NextResponse } from 'next/server';

async function tryPages(baseUrl: string, paths: string[]) {
  for (const path of paths) {
    try {
      const fullUrl = `${baseUrl.replace(/\/$/, '')}${path}`;
      const res = await fetch(fullUrl, { cache: 'no-store' });
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
    .replace(/\s+/g, ' ')
    .match(/<p[^>]*>(.*?)<\/p>/gi)?.map(p => p.replace(/<[^>]+>/g, '').trim())
    .filter(p => p.length > 40 && p.length < 300) ?? [];
  return cleanText[0] || 'No values summary found.';
}

async function getNews(company: string): Promise<{ title: string; link: string }[]> {
  try {
    const feed = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(company)}`);
    const xml = await feed.text();
    const items = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>/g)];
    return items.slice(0, 3).map(match => ({
      title: match[1],
      link: match[2],
    }));
  } catch (err) {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get('company');
  if (!company) return NextResponse.json({ error: 'Missing company name' }, { status: 400 });

  try {
    const query = `${company} official site`;
    const duckDuckGoURL = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(duckDuckGoURL);
    const html = await res.text();
    const match = html.match(/uddg=([^&"]+)/);
    const rawUrl = match?.[1];
    const decodedUrl = rawUrl ? decodeURIComponent(rawUrl) : null;

    let summary = 'No values summary found.';
    if (decodedUrl) {
      const subpages = ['/about', '/about-us', '/mission', '/company'];
      const result = await tryPages(decodedUrl, subpages);
      if (result?.html) {
        summary = extractSummary(result.html);
      }
    }

    const news = await getNews(company);

    return NextResponse.json({
      url: decodedUrl ?? 'Website not found',
      summary,
      news,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
