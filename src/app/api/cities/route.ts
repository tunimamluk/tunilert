import { NextResponse } from "next/server";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (compatible; Tunilert/1.0)",
};

let cachedCities: unknown = null;
let cacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET() {
  if (cachedCities && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cachedCities);
  }

  try {
    const res = await fetch(
      "https://www.oref.org.il/alerts/alertsAreas.json",
      {
        headers: OREF_HEADERS,
        cache: "no-store",
      }
    );

    const text = await res.text();
    const data = JSON.parse(text);
    cachedCities = data;
    cacheTime = Date.now();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
