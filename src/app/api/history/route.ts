import { NextRequest, NextResponse } from "next/server";
import { addAlerts, queryAlerts, totalStored, StoredAlert } from "@/lib/store";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36",
};

async function fetchLatestFromOref(): Promise<StoredAlert[]> {
  try {
    const res = await fetch(
      "https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=2000-01-01&toDate=2099-12-31&mode=0",
      { headers: OREF_HEADERS, cache: "no-store" }
    );
    if (!res.ok) return [];

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) return [];

    let text: string;
    // Handle UTF-16-LE BOM
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;
  const fromTime = searchParams.get("fromTime") ?? "00:00";
  const toTime = searchParams.get("toTime") ?? "23:59";

  // Fetch latest from oref and persist new records
  const fresh = await fetchLatestFromOref();
  const newCount = addAlerts(fresh);
  console.log(`[store] +${newCount} new alerts, total: ${totalStored()}`);

  // Return filtered results + total stored count
  const results = queryAlerts({ fromDate, toDate, fromTime, toTime });
  return NextResponse.json({ results, total: totalStored() });
}
