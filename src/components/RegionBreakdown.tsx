"use client";

import { HistoricalAlert, isRealAlert } from "@/lib/types";

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
}

export default function RegionBreakdown({ alerts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 h-72 animate-pulse" />
    );
  }

  const cityCounts: Record<string, number> = {};
  alerts.filter((a) => isRealAlert(a.category)).forEach((a) => {
    const city = a.data?.trim();
    if (city) cityCounts[city] = (cityCounts[city] ?? 0) + 1;
  });

  const sorted = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const max = sorted[0]?.[1] ?? 1;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-gray-200 font-semibold mb-4">Top Targeted Cities</h2>
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          No data for selected range
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
          {sorted.map(([city, count]) => (
            <div key={city} className="flex items-center gap-3">
              <span
                className="text-gray-300 text-sm w-36 shrink-0 truncate"
                title={city}
              >
                {city}
              </span>
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-gray-400 text-xs w-8 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
