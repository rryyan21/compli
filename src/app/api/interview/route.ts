import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
const Serp = require("google-search-results-nodejs");

const serp = new Serp.GoogleSearch(process.env.SERPAPI_API_KEY!);
const CACHE_FILE = path.join(process.cwd(), "searchCache.json");

// Load cache
let fileCache: Record<string, string | null> = {};
(async () => {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf8");
    fileCache = JSON.parse(data);
  } catch {
    fileCache = {};
  }
})();
