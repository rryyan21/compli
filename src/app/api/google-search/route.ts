import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  const role = searchParams.get('role');
  const university = searchParams.get('university');

  if (!company) {
    return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !searchEngineId) {
    return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
  }

  try {
    // Build the query string
    let query = `site:linkedin.com/in/ "${company}"`;
    if (role && role.trim() !== "") {
      query += ` "${role}"`;
    }
    if (university && university.trim() !== "") {
      query += ` "${university}"`;
    }
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch search results');
    }

    // Process and format the results
    const results = data.items?.map((item: any) => ({
      title: item.title.replace(' | LinkedIn', ''),
      link: item.link,
      snippet: item.snippet,
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Google Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
} 