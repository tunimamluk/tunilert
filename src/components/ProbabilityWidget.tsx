"use client";

import { HistoricalAlert, isRealAlert } from "@/lib/types";
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfDay,
  getDay,
} from "date-fns";

interface Props {
  alerts: HistoricalAlert[];
  fromDate: string;
  toDate: string;
  isLoading: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProbabilityWidget({
  alerts,
  fromDate,
  toDate,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 h-64 animate-pulse" />
    );
  }

  const realAlerts = alerts.filter((a) => isRealAlert(a.category));

  if (realAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
        <h2 className="text-gray-200 font-semibold mb-4">Alert Probability</h2>
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
          No data for selected range
        </div>
      </div>
    );
  }

  const days = eachDayOfInterval({
    start: parseISO(fromDate),
    end: parseISO(toDate),
  });

  const totalDays = days.length;

  // Days with at least one real alert
  const daysWithAlert = new Set(
    realAlerts.map((a) =>
      format(startOfDay(new Date(a.alertDate)), "yyyy-MM-dd")
    )
  );

  const overallPct = Math.round((daysWithAlert.size / totalDays) * 100);

  // By day of week
  const dayAlertCount = Array(7).fill(0);
  const dayTotalCount = Array(7).fill(0);
  days.forEach((d) => {
    dayTotalCount[getDay(d)]++;
  });
  daysWithAlert.forEach((ds) => {
    dayAlertCount[getDay(parseISO(ds))]++;
  });

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-gray-200 font-semibold mb-1">Alert Probability</h2>
      <p className="text-gray-500 text-xs mb-4">
        Chance of at least one alert on any given day
      </p>

      {/* Overall */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4 text-center">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">
          Overall ({totalDays} days)
        </p>
        <p className="text-5xl font-bold text-orange-400">{overallPct}%</p>
        <p className="text-gray-500 text-xs mt-1">
          {daysWithAlert.size} / {totalDays} days had alerts
        </p>
      </div>

      {/* By day of week */}
      <div className="space-y-2">
        {DAYS.map((name, i) => {
          const total = dayTotalCount[i];
          const withAlert = dayAlertCount[i];
          const pct = total > 0 ? Math.round((withAlert / total) * 100) : 0;
          return (
            <div key={name} className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-20 shrink-0">{name.slice(0, 3)}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-gray-400 text-xs w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
