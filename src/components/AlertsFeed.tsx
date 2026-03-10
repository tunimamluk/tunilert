"use client";

import { HistoricalAlert, CATEGORY_LABELS, isRealAlert } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
}

const CATEGORY_COLORS: Record<number, string> = {
  1: "text-red-400 bg-red-950/50 border-red-800/50",
  2: "text-orange-400 bg-orange-950/50 border-orange-800/50",
  7: "text-yellow-400 bg-yellow-950/50 border-yellow-800/50",
  9: "text-purple-400 bg-purple-950/50 border-purple-800/50",
  10: "text-red-400 bg-red-950/50 border-red-800/50",
  11: "text-blue-400 bg-blue-950/50 border-blue-800/50",
};

function groupAlertsByEvent(alerts: HistoricalAlert[]) {
  // Group alerts that fired at the same minute (same event hitting multiple cities)
  const events: { key: string; time: string; date: string; category: number; cities: string[] }[] = [];
  const seen = new Map<string, number>();

  const real = alerts.filter((a) => isRealAlert(a.category));

  for (const a of real) {
    const minute = a.alertDate.slice(0, 16); // "2026-03-10T18:29"
    const key = `${minute}|${a.category}`;
    if (seen.has(key)) {
      events[seen.get(key)!].cities.push(a.data);
    } else {
      seen.set(key, events.length);
      events.push({
        key,
        time: a.time.slice(0, 5),
        date: a.alertDate.slice(0, 10),
        category: a.category,
        cities: [a.data],
      });
    }
  }

  return events;
}

export default function AlertsFeed({ alerts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 space-y-3">
        <h2 className="text-gray-200 font-semibold">Recent Alerts</h2>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const events = groupAlertsByEvent(alerts);

  // Group by date
  const byDate: Record<string, typeof events> = {};
  for (const e of events) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-200 font-semibold">Recent Alerts</h2>
        <span className="text-gray-500 text-xs">{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          No real alerts in selected range
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {dates.map((date) => (
            <div key={date}>
              <div className="text-gray-500 text-xs font-medium mb-2 sticky top-0 bg-gray-900/80 py-1">
                {format(parseISO(date), "EEEE, MMMM d yyyy")}
              </div>
              <div className="space-y-2">
                {byDate[date].map((event) => {
                  const colorClass =
                    CATEGORY_COLORS[event.category] ??
                    "text-red-400 bg-red-950/50 border-red-800/50";
                  const label =
                    CATEGORY_LABELS[event.category] ?? "Alert";
                  return (
                    <div
                      key={event.key}
                      className={`flex gap-3 items-start rounded-lg border px-3 py-2.5 ${colorClass}`}
                    >
                      <span className="text-xs font-mono mt-0.5 shrink-0 opacity-70">
                        {event.time}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">
                          {label}
                        </p>
                        <p className="text-sm leading-snug">
                          {event.cities.slice(0, 6).join(", ")}
                          {event.cities.length > 6 && (
                            <span className="opacity-60">
                              {" "}+{event.cities.length - 6} more
                            </span>
                          )}
                        </p>
                      </div>
                      {event.cities.length > 1 && (
                        <span className="text-xs opacity-50 shrink-0 mt-0.5">
                          {event.cities.length} cities
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
