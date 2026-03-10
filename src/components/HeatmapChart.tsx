"use client";

import { HistoricalAlert, isRealAlert } from "@/lib/types";
import { getDay, getHours } from "date-fns";

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HeatmapChart({ alerts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 h-64 animate-pulse" />
    );
  }

  // Build grid: [day][hour] = count
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0)
  );

  alerts.filter((a) => isRealAlert(a.category)).forEach((a) => {
    const date = new Date(a.alertDate);
    const day = getDay(date);
    const hour = getHours(date);
    grid[day][hour]++;
  });

  const maxVal = Math.max(1, ...grid.flat());

  function cellColor(count: number): string {
    if (count === 0) return "bg-gray-800";
    const intensity = count / maxVal;
    if (intensity < 0.2) return "bg-red-900/60";
    if (intensity < 0.4) return "bg-red-800/70";
    if (intensity < 0.6) return "bg-red-700/80";
    if (intensity < 0.8) return "bg-red-600";
    return "bg-red-500";
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-gray-200 font-semibold mb-4">
        Alert Frequency by Day &amp; Hour
      </h2>
      {alerts.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
          No data for selected range
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour labels */}
            <div className="flex ml-10 mb-1">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-gray-600 text-[10px]"
                >
                  {h % 4 === 0 ? `${h}:00` : ""}
                </div>
              ))}
            </div>
            {/* Rows */}
            {DAYS.map((day, di) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="text-gray-500 text-xs w-9 text-right pr-1">
                  {day}
                </span>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    title={`${day} ${h}:00 — ${grid[di][h]} alerts`}
                    className={`flex-1 h-5 rounded-sm ${cellColor(grid[di][h])}`}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-gray-600 text-xs">Less</span>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <div
                  key={v}
                  className={`w-4 h-4 rounded-sm ${cellColor(Math.round(v * maxVal))}`}
                />
              ))}
              <span className="text-gray-600 text-xs">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
