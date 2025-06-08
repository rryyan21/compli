import { NextResponse } from 'next/server';

async function fetchGoogleResults(query: string) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch search results');
  }

  return (data.items || []).map((item: any) => ({
    title: item.title.replace(' | LinkedIn', ''),
    link: item.link,
    snippet: item.snippet,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  const university = searchParams.get('university');

  if (!company) {
    return NextResponse.json({ error: 'Missing company parameter' }, { status: 400 });
  }

  const searchQuery = university
    ? `${company} employees site:linkedin.com/in "${university}"`
    : `${company} employees site:linkedin.com/in`;

  try {
    const results = await fetchGoogleResults(searchQuery);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in /api/google-search:', error);
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
  }
} 