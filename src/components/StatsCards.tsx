"use client";

import { useState, useEffect, useRef } from "react";
import { HistoricalAlert, isRealAlert } from "@/lib/types";
import { isToday, isThisWeek } from "date-fns";
import { Settings, X } from "lucide-react";

export interface AllTimeStats {
  busiestDay: { date: string; count: number } | null;
  totalCitiesHit: number;
  mostActiveMonth: { month: string; count: number } | null;
}

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
  fromTime: string;
  toTime: string;
}

type StatKey = "today" | "lastHour" | "thisWeek" | "mostTargeted";

const CONFIGURABLE_OPTIONS: { key: StatKey; label: string; description: string }[] = [
  { key: "today",        label: "Alerts Today",  description: "Total alerts fired today" },
  { key: "lastHour",     label: "Last Hour",     description: "Alerts in the past 60 min" },
  { key: "thisWeek",     label: "This Week",     description: "Alerts in the current week" },
  { key: "mostTargeted", label: "Most Targeted", description: "City hit most in selected range" },
];

const DEFAULT_KEYS: StatKey[] = ["lastHour", "thisWeek", "mostTargeted"];
const LS_KEY = "tunilert_stat_cards_v5";

const CARD_COLORS: Record<StatKey, string> = {
  today:        "border-red-800/50 bg-red-950/30 text-red-300",
  lastHour:     "border-orange-800/50 bg-orange-950/30 text-orange-300",
  thisWeek:     "border-teal-800/50 bg-teal-950/30 text-teal-300",
  mostTargeted: "border-purple-800/50 bg-purple-950/30 text-purple-300",
};

function StatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold truncate">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1 truncate">{sub}</p>}
    </div>
  );
}

export default function StatsCards({ alerts, isLoading, fromTime, toTime }: Props) {
  const [selectedKeys, setSelectedKeys] = useState<StatKey[]>(DEFAULT_KEYS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const validKeys = new Set<string>(CONFIGURABLE_OPTIONS.map((o) => o.key));
        const parsed: StatKey[] = JSON.parse(saved);
        const filtered = parsed.filter((k) => validKeys.has(k));
        if (Array.isArray(filtered) && filtered.length > 0) setSelectedKeys(filtered);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(selectedKeys)); } catch { /* ignore */ }
  }, [selectedKeys]);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  function toggleKey(key: StatKey) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/30 p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const real = alerts.filter((a) => isRealAlert(a.category));
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const todayCount = real.filter((a) => isToday(new Date(a.alertDate))).length;
  const rangeCount = real.filter((a) => {
    if (!isToday(new Date(a.alertDate))) return false;
    const t = a.time.slice(0, 5);
    return t >= fromTime && t <= toTime;
  }).length;

  const cityCounts: Record<string, number> = {};
  real.forEach((a) => {
    const city = a.data?.trim();
    if (city) cityCounts[city] = (cityCounts[city] ?? 0) + 1;
  });
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];

  function getStatValue(key: StatKey): { value: string | number; sub?: string } {
    switch (key) {
      case "today":
        return { value: todayCount };
      case "lastHour":
        return { value: real.filter((a) => new Date(a.alertDate) >= oneHourAgo).length };
      case "thisWeek":
        return { value: real.filter((a) => isThisWeek(new Date(a.alertDate))).length };
      case "mostTargeted":
        return {
          value: topCity ? topCity[0] : "—",
          sub: topCity ? `${topCity[1]} hits` : undefined,
        };
    }
  }

  return (
    <div className="space-y-2" ref={panelRef}>
      <div className="flex justify-end">
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            settingsOpen
              ? "border-gray-600 bg-gray-800 text-gray-300"
              : "border-gray-700 bg-gray-900/40 text-gray-500 hover:text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Settings size={12} />
          Customize
        </button>
      </div>

      {settingsOpen && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 text-sm font-medium">Choose which stats to show</p>
            <button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONFIGURABLE_OPTIONS.map(({ key, label, description }) => {
              const active = selectedKeys.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                    active
                      ? "border-gray-600 bg-gray-800/60"
                      : "border-gray-800 bg-gray-900/20 hover:bg-gray-800/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleKey(key)}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <p className={`text-xs font-medium ${active ? "text-gray-200" : "text-gray-400"}`}>
                      {label}
                    </p>
                    <p className="text-gray-600 text-[11px] mt-0.5">{description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setSelectedKeys(DEFAULT_KEYS)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}

      {/* Locked "Alerts Today" card + 3 configurable slots */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Alerts in Range"
          value={rangeCount}
          sub={`${fromTime} – ${toTime}`}
          colorClass="border-blue-800/50 bg-blue-950/30 text-blue-300"
        />

        {selectedKeys.slice(0, 3).map((key) => {
          const { value, sub } = getStatValue(key);
          const label = CONFIGURABLE_OPTIONS.find((o) => o.key === key)!.label;
          return (
            <StatCard key={key} label={label} value={value} sub={sub} colorClass={CARD_COLORS[key]} />
          );
        })}

        {selectedKeys.length < 3 &&
          Array.from({ length: 3 - selectedKeys.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border border-dashed border-gray-800 p-4 flex items-center justify-center cursor-pointer hover:border-gray-600 transition-colors"
            >
              <span className="text-gray-700 text-xs">+ Add stat</span>
            </div>
          ))}
      </div>
    </div>
  );
}
