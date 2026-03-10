import { NextResponse } from "next/server";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/11226-he/pakar.aspx",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36",
};

export async function GET() {
  try {
    const res = await fetch(
      "https://www.oref.org.il/warningMessages/alert/Alerts.json",
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
