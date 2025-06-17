import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache configuration
const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCacheKey(company: string, role: string | null, university: string | null): string {
  return `${company}-${role || ''}-${university || ''}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function getCachedResults(cacheKey: string) {
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  if (fs.existsSync(cacheFile)) {
    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    if (Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
      return cachedData.results;
    }
  }
  return null;
}

function saveToCache(cacheKey: string, results: any[]) {
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  const cacheData = {
    timestamp: Date.now(),
    results
  };
  fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  const role = searchParams.get('role');
  const university = searchParams.get('university');

  if (!company) {
    return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = getCacheKey(company, role, university);
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    return NextResponse.json({ results: cachedResults, cached: true });
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

    // Save to cache
    saveToCache(cacheKey, results);

    return NextResponse.json({ results, cached: false });
  } catch (error) {
    console.error('Google Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
} 