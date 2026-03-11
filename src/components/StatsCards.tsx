"use client";

import { useState, useEffect, useRef } from "react";
import { HistoricalAlert, isRealAlert } from "@/lib/types";
import { isToday } from "date-fns";
import { Settings, X } from "lucide-react";

// Re-exported so page.tsx import doesn't break (it imports AllTimeStats from here)
export interface AllTimeStats {
  busiestDay: { date: string; count: number } | null;
  totalCitiesHit: number;
  mostActiveMonth: { month: string; count: number } | null;
}

interface Props {
  alerts: HistoricalAlert[];
  isLoading: boolean;
}

// Each of the 4 slots can be "today" or null (empty)
type SlotKey = "today" | null;
const DEFAULT_SLOTS: SlotKey[] = ["today", "today", "today", "today"];
const LS_KEY = "tunilert_slots_v4";

function StatCard({ value }: { value: number }) {
  return (
    <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4">
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Alerts Today</p>
      <p className="text-3xl font-bold text-red-300">{value}</p>
    </div>
  );
}

export default function StatsCards({ alerts, isLoading }: Props) {
  const [slots, setSlots] = useState<SlotKey[]>(DEFAULT_SLOTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed: SlotKey[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) setSlots(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(slots)); } catch { /* ignore */ }
  }, [slots]);

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

  function toggleSlot(i: number) {
    setSlots((prev) => {
      const next = [...prev] as SlotKey[];
      next[i] = next[i] === null ? "today" : null;
      return next;
    });
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

  const todayCount = alerts
    .filter((a) => isRealAlert(a.category) && isToday(new Date(a.alertDate)))
    .length;

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
            <p className="text-gray-300 text-sm font-medium">Choose which cards to show</p>
            <button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {slots.map((slot, i) => (
              <label
                key={i}
                className={`flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                  slot !== null
                    ? "border-gray-600 bg-gray-800/60"
                    : "border-gray-800 bg-gray-900/20 hover:bg-gray-800/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={slot !== null}
                  onChange={() => toggleSlot(i)}
                  className="accent-red-500"
                />
                <div>
                  <p className={`text-xs font-medium ${slot !== null ? "text-gray-200" : "text-gray-400"}`}>
                    Alerts Today
                  </p>
                  <p className="text-gray-600 text-[11px]">Card {i + 1}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setSlots(DEFAULT_SLOTS)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {slots.map((slot, i) =>
          slot !== null ? (
            <StatCard key={i} value={todayCount} />
          ) : (
            <div
              key={i}
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border border-dashed border-gray-800 p-4 flex items-center justify-center cursor-pointer hover:border-gray-600 transition-colors"
            >
              <span className="text-gray-700 text-xs">+ Add stat</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
