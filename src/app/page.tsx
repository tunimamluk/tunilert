"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { HistoricalAlert, LiveAlert } from "@/lib/types";
import LiveAlertsBanner from "@/components/LiveAlertsBanner";
import StatsCards from "@/components/StatsCards";
import HistoryChart from "@/components/HistoryChart";
import RegionBreakdown from "@/components/RegionBreakdown";
import AlertsFeed from "@/components/AlertsFeed";
import MyAreaCard from "@/components/MyAreaCard";
import { Activity, Clock } from "lucide-react";

const AlertsMap = dynamic(() => import("@/components/AlertsMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 h-[360px] animate-pulse" />
  ),
});

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");

  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");
  const [alerts, setAlerts] = useState<HistoricalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<LiveAlert | null>(null);
  const [totalStored, setTotalStored] = useState<number | null>(null);
  const [dataRange, setDataRange] = useState<{ from: string | null; to: string | null; uniqueDates: number } | null>(null);
  const [bulkFetching, setBulkFetching] = useState(false);

  // My area — shared between LiveAlertsBanner (gating sound) and any future area widget
  const [myCity, setMyCity] = useState<string>("");
  useEffect(() => {
    try { setMyCity(localStorage.getItem("tunilert_my_city") ?? ""); } catch { /* ignore */ }
  }, []);

  function handleCityChange(city: string) {
    setMyCity(city);
    try { localStorage.setItem("tunilert_my_city", city); } catch { /* ignore */ }
  }

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ _t: String(Date.now()) });
      const res = await fetch(`/api/history?${params}`);
      const json = await res.json();
      setAlerts(Array.isArray(json.results) ? json.results : []);
      setTotalStored(json.total ?? null);
      if (json.dateRange) setDataRange(json.dateRange);
      setBulkFetching(json.bulkFetching ?? false);
    } catch {
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const inputClass =
    "bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600";

  return (
    <div className="min-h-screen bg-[#09090f] text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Activity className="text-red-500" size={24} />
        <h1 className="text-xl font-bold tracking-tight">
          Tuni<span className="text-red-500">lert</span>
        </h1>
        <span className="text-gray-600 text-sm ml-1">Israel Red Alert Statistics</span>
        <div className="ml-auto text-right">
          {totalStored !== null && (
            <span className="text-gray-600 text-xs">{totalStored.toLocaleString()} alerts stored</span>
          )}
          {dataRange?.from && (
            <span className="text-gray-700 text-xs block">
              Data: {dataRange.from} → {dataRange.to}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <LiveAlertsBanner onAlert={setLiveAlert} myCity={myCity} onCityChange={handleCityChange} />

        {/* Time filter */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/20 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-gray-500 text-xs uppercase tracking-widest flex items-center gap-1">
            <Clock size={12} /> Time
          </span>
          <input
            type="time"
            value={fromTime}
            onChange={(e) => setFromTime(e.target.value)}
            className={inputClass}
          />
          <span className="text-gray-600 text-sm">–</span>
          <input
            type="time"
            value={toTime}
            onChange={(e) => setToTime(e.target.value)}
            className={inputClass}
          />
          {[
            { label: "All day",   ft: "00:00", tt: "23:59" },
            { label: "Night",     ft: "00:00", tt: "06:00" },
            { label: "Morning",   ft: "06:00", tt: "12:00" },
            { label: "Afternoon", ft: "12:00", tt: "18:00" },
            { label: "Evening",   ft: "18:00", tt: "23:59" },
          ].map((r) => (
            <button
              key={r.label}
              onClick={() => { setFromTime(r.ft); setToTime(r.tt); }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                fromTime === r.ft && toTime === r.tt
                  ? "bg-gray-700 border-gray-500 text-gray-200"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
          {isLoading && <span className="text-gray-500 text-xs animate-pulse">Loading…</span>}
        </div>

        {bulkFetching && (
          <p className="text-blue-400/80 text-xs animate-pulse text-center">
            Loading historical data — more records will appear shortly.
          </p>
        )}

        <StatsCards alerts={alerts} isLoading={isLoading} fromTime={fromTime} toTime={toTime} />

        <MyAreaCard alerts={alerts} isLoading={isLoading} myCity={myCity} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <AlertsMap historicalAlerts={alerts} liveAlert={liveAlert} />
            <RegionBreakdown alerts={alerts} isLoading={isLoading} />
          </div>
          <AlertsFeed alerts={alerts} isLoading={isLoading} />
        </div>

        <HistoryChart
          alerts={alerts}
          fromDate={today}
          toDate={today}
          isLoading={isLoading}
        />
      </main>

      <footer className="border-t border-gray-800 text-center text-gray-600 text-xs py-4 mt-6">
        Data sourced from Pikud HaOref (Israel Home Front Command) · Tunilert
      </footer>
    </div>
  );
}
