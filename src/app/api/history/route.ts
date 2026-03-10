import { NextRequest, NextResponse } from "next/server";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (compatible; Tunilert/1.0)",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from") ?? "";
  const toDate = searchParams.get("to") ?? "";

  try {
    const url = `https://www.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=${fromDate}&toDate=${toDate}&mode=0`;
    const res = await fetch(url, {
      headers: OREF_HEADERS,
      cache: "no-store",
    });

    const text = await res.text();
    if (!text || text.trim() === "" || text.trim() === "null") {
      return NextResponse.json([]);
    }

    const data = JSON.parse(text);
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([]);
  }
}
