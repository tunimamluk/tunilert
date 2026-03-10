"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HistoricalAlert } from "@/lib/types";
import { format, startOfDay, eachDayOfInterval, parseISO } from "date-fns";

interface Props {
  alerts: HistoricalAlert[];
  fromDate: string;
  toDate: string;
  isLoading: boolean;
}

export default function HistoryChart({
  alerts,
  fromDate,
  toDate,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 h-72 animate-pulse" />
    );
  }

  const days = eachDayOfInterval({
    start: parseISO(fromDate),
    end: parseISO(toDate),
  });

  const countByDay: Record<string, number> = {};
  alerts.forEach((a) => {
    const day = format(startOfDay(new Date(a.alertDate)), "yyyy-MM-dd");
    countByDay[day] = (countByDay[day] ?? 0) + 1;
  });

  const data = days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: format(day, "MMM d"),
      alerts: countByDay[key] ?? 0,
    };
  });

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-gray-200 font-semibold mb-4">Alerts Over Time</h2>
      {alerts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          No data for selected range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: 8,
                color: "#f9fafb",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Area
              type="monotone"
              dataKey="alerts"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#alertGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
