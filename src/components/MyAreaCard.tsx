"use client";

import { useMemo } from "react";
import { HistoricalAlert, isRealAlert, CATEGORY_LABELS, CITY_COORDS } from "@/lib/types";
import { formatDistanceToNow, parseISO, getHours } from "date-fns";
import { MapPin, Clock } from "lucide-react";

function pad(h: number) { return String(h).padStart(2, "0"); }

const CITY_LIST = Object.keys(CITY_COORDS).sort((a, b) => a.localeCompare(b, "he"));

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
  myCity: string;
  onCityChange: (city: string) => void;
}

export default function MyAreaCard({ alerts, isLoading, myCity, onCityChange }: Props) {
  const stats = useMemo(() => {
    if (!myCity) return null;

    const cityAlerts = alerts
      .filter((a) => isRealAlert(a.category) && a.data?.trim() === myCity)
      .sort((a, b) => new Date(b.alertDate).getTime() - new Date(a.alertDate).getTime());

    if (cityAlerts.length === 0) return { total: 0, last: null, recent: [], hourCounts: Array(24).fill(0) };

    const hourCounts = Array(24).fill(0);
    cityAlerts.forEach((a) => hourCounts[getHours(new Date(a.alertDate))]++);

    return {
      total: cityAlerts.length,
      last: cityAlerts[0],
      recent: cityAlerts.slice(0, 5),
      hourCounts,
    };
  }, [alerts, myCity]);

  if (isLoading) {
    return <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 h-36 animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5 space-y-4">
      {/* Header + city selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-gray-200 font-semibold flex items-center gap-2">
          <MapPin size={15} className="text-red-400" />
          My Area
        </h2>
        <select
          value={myCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600"
        >
          <option value="">Select your area…</option>
          {CITY_LIST.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* No city selected */}
      {!myCity && (
        <p className="text-gray-600 text-sm">Select your city above to see when it last had an alert.</p>
      )}

      {/* City selected but no data */}
      {myCity && stats && stats.total === 0 && (
        <p className="text-gray-500 text-sm">No alerts found for <span className="text-gray-300">{myCity}</span> in the loaded data.</p>
      )}

      {/* City selected, has data */}
      {myCity && stats && stats.last && (
        <div className="space-y-3">
          {/* Last alert highlight */}
          <div className="bg-gray-800/60 rounded-xl px-4 py-3 flex items-center gap-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Last alert</p>
              <p className="text-gray-100 font-semibold text-lg">
                {formatDistanceToNow(parseISO(stats.last.alertDate), { addSuffix: true })}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {stats.last.alertDate.slice(0, 10)} · {stats.last.time.slice(0, 5)} ·{" "}
                {CATEGORY_LABELS[stats.last.category] ?? stats.last.category_desc}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Total hits</p>
              <p className="text-2xl font-bold text-red-400">{stats.total.toLocaleString()}</p>
            </div>
          </div>

          {/* Recent alerts list */}
          {stats.recent.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-gray-600 text-xs uppercase tracking-widest flex items-center gap-1">
                <Clock size={11} /> Recent
              </p>
              {stats.recent.map((a) => (
                <div
                  key={a.rid}
                  className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg bg-gray-800/30"
                >
                  <span className="text-gray-500 text-xs font-mono shrink-0">{a.alertDate.slice(0, 10)}</span>
                  <span className="text-gray-500 text-xs font-mono shrink-0">{a.time.slice(0, 5)}</span>
                  <span className="text-gray-400 text-xs truncate">
                    {CATEGORY_LABELS[a.category] ?? a.category_desc}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Hourly distribution */}
          {(() => {
            const maxH = Math.max(1, ...stats.hourCounts);
            const peakHour = stats.hourCounts.indexOf(maxH);
            return (
              <div>
                <p className="text-gray-600 text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Clock size={11} /> Alerts by hour
                  <span className="text-gray-700 normal-case tracking-normal ml-1">
                    · most active: {pad(peakHour)}:00–{pad(peakHour)}:59
                  </span>
                </p>
                <div className="flex items-end gap-px" style={{ height: 44 }}>
                  {stats.hourCounts.map((count, h) => {
                    const barH = count > 0 ? Math.max(3, Math.round((count / maxH) * 44)) : 2;
                    return (
                      <div key={h} className="flex-1" title={`${pad(h)}:00 — ${count} alert${count !== 1 ? "s" : ""}`}>
                        <div
                          style={{ height: barH }}
                          className={`w-full rounded-sm ${
                            h === peakHour
                              ? "bg-red-500"
                              : count > 0
                              ? "bg-orange-500/60"
                              : "bg-gray-800"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-gray-700 text-[10px] mt-1 select-none">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
