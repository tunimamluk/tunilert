import { NextRequest, NextResponse } from "next/server";
import { addAlerts, queryAlerts, totalStored, getDateRange, getAllTimeStats, StoredAlert } from "@/lib/store";

// ── Tzevaadom threat → oref category ─────────────────────────────────────
const THREAT_TO_CATEGORY: Record<number, number> = {
  0: 1,  // rockets/missiles
  1: 7,  // hostile aircraft
  2: 9,  // earthquake
  3: 10, // tsunami
  4: 11, // hazardous materials
  5: 2,  // UAV/drone
};
const THREAT_TO_DESC: Record<number, string> = {
  0: "ירי רקטות וטילים",
  1: "חדירת כלי טיס עוין",
  2: "רעידת אדמה",
  3: "צונאמי",
  4: "חומרים מסוכנים",
  5: "כטב\"מ עוין",
};

// Tzevaadom rids: offset to avoid collision with oref rids
const TZ_RID_OFFSET = 2_000_000_000;

// Compact format from all.json: [alertId, threat, [cities], unixTimestamp]
type CompactAlert = [number, number, string[], number];

function compactToStoredAlerts(items: CompactAlert[]): StoredAlert[] {
  const result: StoredAlert[] = [];
  for (const [alertId, threat, cities, ts] of items) {
    const dt = new Date(ts * 1000);
    const alertDate = dt.toISOString().replace("T", "T").slice(0, 19);
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = dt.getUTCFullYear();
    const hh = String(dt.getUTCHours()).padStart(2, "0");
    const min = String(dt.getUTCMinutes()).padStart(2, "0");
    const ss = String(dt.getUTCSeconds()).padStart(2, "0");
    const category = THREAT_TO_CATEGORY[threat] ?? 1;
    const category_desc = THREAT_TO_DESC[threat] ?? "Alert";
    for (let i = 0; i < cities.length; i++) {
      result.push({
        rid: TZ_RID_OFFSET + alertId * 10_000 + i,
        data: cities[i],
        alertDate,
        date: `${dd}.${mm}.${yyyy}`,
        time: `${hh}:${min}:${ss}`,
        category,
        category_desc,
        matrix_id: 0,
      });
    }
  }
  return result;
}

// ── Oref API (for fresh incremental updates) ──────────────────────────────
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

// ── State ─────────────────────────────────────────────────────────────────
let lastBulkFetchTime = 0;
let bulkFetchInProgress = false;
let lastOrefFetch = 0;
let lastOrefFullFetch = 0;
const OREF_INTERVAL_MS = 30_000;
const OREF_FULL_INTERVAL_MS = 120_000;
const BULK_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // Option E: re-fetch every 6 hours

function shouldRunBulkFetch(): boolean {
  if (bulkFetchInProgress) return false;
  return Date.now() - lastBulkFetchTime > BULK_REFRESH_INTERVAL_MS;
}

async function bulkLoadHistorical() {
  if (!shouldRunBulkFetch()) return;
  bulkFetchInProgress = true;
  try {
    console.log("[tunilert] Loading historical data from Tzevaadom all.json…");
    const res = await fetch("https://www.tzevaadom.co.il/static/historical/all.json", {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items: CompactAlert[] = await res.json();
    const alerts = compactToStoredAlerts(items);
    const added = addAlerts(alerts);
    console.log(`[tunilert] Loaded ${added} historical alerts (${items.length} events). Total: ${totalStored()}`);
    lastBulkFetchTime = Date.now();
  } catch (err) {
    console.error("[tunilert] Failed to load historical data:", err);
  } finally {
    bulkFetchInProgress = false;
  }
}

async function fetchOrefIncremental(): Promise<number> {
  const now = Date.now();
  if (now - lastOrefFetch < OREF_INTERVAL_MS) return 0;
  lastOrefFetch = now;

  // Always fetch mode=1 (last day)
  const day = await fetchOrefMode(1);
  let added = addAlerts(day);

  // Every 2 min, also fetch week + month for overlap
  if (now - lastOrefFullFetch > OREF_FULL_INTERVAL_MS) {
    lastOrefFullFetch = now;
    const [week, month] = await Promise.all([fetchOrefMode(2), fetchOrefMode(3)]);
    added += addAlerts(week);
    added += addAlerts(month);
  }

  return added;
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;
  const fromTime = searchParams.get("fromTime") ?? "00:00";
  const toTime = searchParams.get("toTime") ?? "23:59";

  // Kick off bulk historical load (first time + every 6h)
  if (shouldRunBulkFetch()) {
    bulkLoadHistorical(); // non-blocking
  }

  // Incremental oref fetch for recent alerts
  const newCount = await fetchOrefIncremental();
  if (newCount > 0) {
    console.log(`[oref] +${newCount} new alerts, total: ${totalStored()}`);
  }

  const results = queryAlerts({ fromDate, toDate, fromTime, toTime });
  return NextResponse.json({
    results,
    total: totalStored(),
    dateRange: getDateRange(),
    bulkFetching: bulkFetchInProgress,
    allTimeStats: getAllTimeStats(),
  });
}
