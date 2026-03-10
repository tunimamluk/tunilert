import fs from "fs";
import path from "path";

export interface StoredAlert {
  rid: number;
  data: string;        // city name (Hebrew)
  alertDate: string;   // ISO "2026-03-10T18:40:00"
  date: string;        // "10.03.2026"
  time: string;        // "18:40:13"
  category: number;
  category_desc: string;
  matrix_id: number;
}

const DATA_FILE = path.join(process.cwd(), "data", "alerts.json");
const SAVE_INTERVAL_MS = 10_000; // flush to disk every 10s

// In-memory store keyed by rid for O(1) dedup
let alertsMap: Map<number, StoredAlert> = new Map();
let loaded = false;
let dirty = false;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8").trim();
      if (raw && raw !== "[]") {
        const arr: StoredAlert[] = JSON.parse(raw);
        for (const a of arr) alertsMap.set(a.rid, a);
      }
    }
  } catch {
    // corrupt file — start fresh
    alertsMap = new Map();
  }

  // Periodic flush
  setInterval(() => {
    if (dirty) flushToDisk();
  }, SAVE_INTERVAL_MS);
}

function flushToDisk() {
  dirty = false;
  const arr = Array.from(alertsMap.values()).sort(
    (a, b) => new Date(b.alertDate).getTime() - new Date(a.alertDate).getTime()
  );
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr), "utf8");
  } catch {
    // ignore write errors
  }
}

/** Add new alerts, returns count of newly added */
export function addAlerts(incoming: StoredAlert[]): number {
  ensureLoaded();
  let added = 0;
  for (const a of incoming) {
    if (!alertsMap.has(a.rid)) {
      alertsMap.set(a.rid, a);
      added++;
      dirty = true;
    }
  }
  return added;
}

/** Query alerts by date+time range */
export function queryAlerts(opts: {
  fromDate?: string;   // "YYYY-MM-DD"
  toDate?: string;
  fromTime?: string;   // "HH:MM"
  toTime?: string;
}): StoredAlert[] {
  ensureLoaded();
  const { fromDate, toDate, fromTime = "00:00", toTime = "23:59" } = opts;

  return Array.from(alertsMap.values())
    .filter((a) => {
      // Date filter
      const dateStr = a.alertDate.slice(0, 10); // "YYYY-MM-DD"
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;

      // Time filter
      const timeStr = a.time.slice(0, 5); // "HH:MM"
      if (timeStr < fromTime) return false;
      if (timeStr > toTime) return false;

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.alertDate).getTime() - new Date(a.alertDate).getTime()
    );
}

export function totalStored(): number {
  ensureLoaded();
  return alertsMap.size;
}
