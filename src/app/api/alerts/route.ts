import { NextResponse } from "next/server";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (compatible; Tunilert/1.0)",
};

export async function GET() {
  try {
    const res = await fetch(
      "https://www.oref.org.il/WarningMessages/alert/alerts.json",
      {
        headers: OREF_HEADERS,
        cache: "no-store",
      }
    );

    const text = await res.text();
    if (!text || text.trim() === "" || text.trim() === "{}") {
      return NextResponse.json(null);
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}
