import { NextRequest, NextResponse } from "next/server";
import { addAlerts, queryAlerts, totalStored, getDateRange, StoredAlert } from "@/lib/store";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36",
};

async function fetchOrefMode(mode: number): Promise<StoredAlert[]> {
  try {
    const res = await fetch(
      `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=${mode}`,
      { headers: OREF_HEADERS, cache: "no-store" }
    );
    if (!res.ok) return [];

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) return [];

    let text: string;
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      text = buffer.slice(2).toString("utf16le");
    } else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      text = buffer.slice(3).toString("utf8");
    } else {
      text = buffer.toString("utf8");
    }

    text = text.replace(/\x00/g, "").trim();
    if (!text || text === "null" || text === "[]") return [];

    const raw = JSON.parse(text);
    if (!Array.isArray(raw)) return [];

    return raw.filter((a) => a.rid && a.alertDate && a.data) as StoredAlert[];
  } catch {
    return [];
  }
}

// Track last time we did the full multi-mode fetch (avoid hammering oref)
let lastFullFetch = 0;
const FULL_FETCH_INTERVAL_MS = 60_000; // full fetch every 60s max

async function fetchAllFromOref(): Promise<number> {
  const now = Date.now();
  let totalNew = 0;

  // Always fetch mode=1 (last day) - most current data
  const day = await fetchOrefMode(1);
  totalNew += addAlerts(day);

  // Every 60s, also fetch week and month for older data
  if (now - lastFullFetch > FULL_FETCH_INTERVAL_MS) {
    lastFullFetch = now;
    const [week, month] = await Promise.all([fetchOrefMode(2), fetchOrefMode(3)]);
    totalNew += addAlerts(week);
    totalNew += addAlerts(month);
  }

  return totalNew;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;
  const fromTime = searchParams.get("fromTime") ?? "00:00";
  const toTime = searchParams.get("toTime") ?? "23:59";

  // Fetch from oref and persist new records
  const newCount = await fetchAllFromOref();
  if (newCount > 0) {
    console.log(`[store] +${newCount} new alerts, total: ${totalStored()}`);
  }

  // Return filtered results from local store
  const results = queryAlerts({ fromDate, toDate, fromTime, toTime });
  return NextResponse.json({ results, total: totalStored(), dateRange: getDateRange() });
}
