"use client";

import { useState } from "react";
import { HistoricalAlert, isRealAlert, CITY_COORDS } from "@/lib/types";
import { eachDayOfInterval, parseISO, format, getHours, startOfDay } from "date-fns";
import { MapPin } from "lucide-react";

const CITY_LIST = Object.keys(CITY_COORDS).sort((a, b) => a.localeCompare(b, "he"));
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(h: number) {
  return String(h).padStart(2, "0");
}

interface Props {
  alerts: HistoricalAlert[];
  fromDate: string;
  toDate: string;
  isLoading: boolean;
  myCity: string;
  onCityChange: (city: string) => void;
}

export default function AreaHourlyProbability({
  alerts,
  fromDate,
  toDate,
  isLoading,
  myCity,
  onCityChange,
}: Props) {
  const [fromHour, setFromHour] = useState(7);
  const [toHour, setToHour] = useState(9);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 h-72 animate-pulse" />
    );
  }

  const real = alerts.filter((a) => isRealAlert(a.category));
  // Filter by city if one is selected
  const cityAlerts = myCity ? real.filter((a) => a.data?.trim() === myCity) : real;

  // Build per-day → hours lookup
  const alertHoursByDay = new Map<string, Set<number>>();
  cityAlerts.forEach((a) => {
    const day = format(startOfDay(new Date(a.alertDate)), "yyyy-MM-dd");
    const hour = getHours(new Date(a.alertDate));
    if (!alertHoursByDay.has(day)) alertHoursByDay.set(day, new Set());
    alertHoursByDay.get(day)!.add(hour);
  });

  const days = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
  const totalDays = days.length;

  const effectiveFrom = Math.min(fromHour, toHour);
  const effectiveTo = Math.max(fromHour, toHour);

  const daysWithAlert = days.filter((d) => {
    const key = format(d, "yyyy-MM-dd");
    const hours = alertHoursByDay.get(key);
    if (!hours) return false;
    for (const h of hours) {
      if (h >= effectiveFrom && h <= effectiveTo) return true;
    }
    return false;
  }).length;

  const pct = totalDays > 0 ? Math.round((daysWithAlert / totalDays) * 100) : 0;

  // Per-hour counts for the bar chart
  const hourCounts = Array(24).fill(0);
  cityAlerts.forEach((a) => {
    hourCounts[getHours(new Date(a.alertDate))]++;
  });
  const maxCount = Math.max(1, ...hourCounts);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 space-y-4">
      <div>
        <h2 className="text-gray-200 font-semibold">Alert Probability — My Area</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          Chance of an alert in your area during a given hour window, based on the selected date range
        </p>
      </div>

      {/* City selector */}
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-gray-500 shrink-0" />
        <select
          value={myCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600"
        >
          <option value="">All areas (no filter)</option>
          {CITY_LIST.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Hour range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-500 text-xs">Between</span>
        <select
          value={fromHour}
          onChange={(e) => setFromHour(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{pad(h)}:00</option>
          ))}
        </select>
        <span className="text-gray-500 text-xs">and</span>
        <select
          value={toHour}
          onChange={(e) => setToHour(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{pad(h)}:59</option>
          ))}
        </select>
        <span className="text-gray-500 text-xs ml-1">
          ({pad(effectiveFrom)}:00 – {pad(effectiveTo)}:59)
        </span>
      </div>

      {/* Probability result */}
      {cityAlerts.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          {myCity ? `No alerts found for ${myCity} in this date range.` : "No data in selected range."}
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">
              Probability {myCity ? `for ${myCity}` : "all areas"}
            </p>
            <p className="text-5xl font-bold text-orange-400">{pct}%</p>
            <p className="text-gray-500 text-xs mt-1">
              {daysWithAlert} of {totalDays} day{totalDays !== 1 ? "s" : ""} had an alert between {pad(effectiveFrom)}:00–{pad(effectiveTo)}:59
            </p>
          </div>

          {/* Hour bar chart */}
          <div>
            <p className="text-gray-500 text-xs mb-2">
              Alerts by hour{myCity ? ` · ${myCity}` : ""}
            </p>
            <div className="flex items-end gap-px" style={{ height: 56 }}>
              {hourCounts.map((count, h) => {
                const inRange = h >= effectiveFrom && h <= effectiveTo;
                const barH = count > 0 ? Math.max(3, Math.round((count / maxCount) * 56)) : 2;
                return (
                  <div
                    key={h}
                    className="flex-1"
                    title={`${pad(h)}:00 — ${count} alert${count !== 1 ? "s" : ""}`}
                  >
                    <div
                      style={{ height: barH }}
                      className={`w-full rounded-sm ${
                        count === 0
                          ? "bg-gray-800"
                          : inRange
                          ? "bg-orange-500"
                          : "bg-gray-600/50"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-gray-700 text-[10px] mt-1 select-none">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
