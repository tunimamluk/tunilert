"use client";

import { HistoricalAlert, isRealAlert } from "@/lib/types";
import { isToday, isThisWeek } from "date-fns";

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "red" | "orange" | "purple";
}) {
  const colors = {
    blue: "border-blue-800/50 bg-blue-950/30",
    red: "border-red-800/50 bg-red-950/30",
    orange: "border-orange-800/50 bg-orange-950/30",
    purple: "border-purple-800/50 bg-purple-950/30",
  };
  const textColors = {
    blue: "text-blue-300",
    red: "text-red-300",
    orange: "text-orange-300",
    purple: "text-purple-300",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsCards({ alerts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/30 p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  // Only count real alerts, not "event ended" or pre-warnings
  const real = alerts.filter((a) => isRealAlert(a.category));

  const total = real.length;
  const todayCount = real.filter((a) => isToday(new Date(a.alertDate))).length;
  const weekCount = real.filter((a) => isThisWeek(new Date(a.alertDate))).length;

  const cityCounts: Record<string, number> = {};
  real.forEach((a) => {
    const city = a.data?.trim();
    if (city) cityCounts[city] = (cityCounts[city] ?? 0) + 1;
  });
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Alerts" value={total} sub="real alerts only" color="blue" />
      <StatCard label="Today" value={todayCount} color="red" />
      <StatCard label="This Week" value={weekCount} color="orange" />
      <StatCard
        label="Most Targeted"
        value={topCity ? topCity[0] : "—"}
        sub={topCity ? `${topCity[1]} hits` : undefined}
        color="purple"
      />
    </div>
  );
}
