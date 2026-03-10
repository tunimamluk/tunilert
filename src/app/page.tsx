"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, subDays } from "date-fns";
import { HistoricalAlert, LiveAlert } from "@/lib/types";
import LiveAlertsBanner from "@/components/LiveAlertsBanner";
import StatsCards from "@/components/StatsCards";
import HistoryChart from "@/components/HistoryChart";
import RegionBreakdown from "@/components/RegionBreakdown";
import HeatmapChart from "@/components/HeatmapChart";
import ProbabilityWidget from "@/components/ProbabilityWidget";
import { Activity } from "lucide-react";

// Leaflet requires browser — dynamic import with no SSR
const AlertsMap = dynamic(() => import("@/components/AlertsMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 h-[360px] animate-pulse" />
  ),
});

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);
  const [alerts, setAlerts] = useState<HistoricalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<LiveAlert | null>(null);

  const fetchHistory = useCallback(async (from: string, to: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/history?from=${from}&to=${to}`,
        { cache: "no-store" }
      );
      const data: HistoricalAlert[] = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(fromDate, toDate);
  }, [fetchHistory, fromDate, toDate]);

  const quickRanges = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "1y", days: 365 },
  ];

  function applyQuickRange(days: number) {
    const from = format(subDays(new Date(), days), "yyyy-MM-dd");
    setFromDate(from);
    setToDate(today);
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Activity className="text-red-500" size={24} />
        <h1 className="text-xl font-bold tracking-tight">
          Tuni<span className="text-red-500">lert</span>
        </h1>
        <span className="text-gray-600 text-sm ml-1">
          Israel Red Alert Statistics
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Live alert banner */}
        <LiveAlertsBanner onAlert={setLiveAlert} />

        {/* Date range controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-gray-500 text-sm">From</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500 text-sm">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600"
            />
          </div>
          <div className="flex gap-2 ml-2">
            {quickRanges.map((r) => (
              <button
                key={r.label}
                onClick={() => applyQuickRange(r.days)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
          {isLoading && (
            <span className="text-gray-500 text-sm animate-pulse">
              Loading…
            </span>
          )}
        </div>

        {/* Stats cards */}
        <StatsCards alerts={alerts} isLoading={isLoading} />

        {/* Map + Region breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <AlertsMap historicalAlerts={alerts} liveAlert={liveAlert} />
          </div>
          <RegionBreakdown alerts={alerts} isLoading={isLoading} />
        </div>

        {/* History chart */}
        <HistoryChart
          alerts={alerts}
          fromDate={fromDate}
          toDate={toDate}
          isLoading={isLoading}
        />

        {/* Heatmap + Probability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HeatmapChart alerts={alerts} isLoading={isLoading} />
          <ProbabilityWidget
            alerts={alerts}
            fromDate={fromDate}
            toDate={toDate}
            isLoading={isLoading}
          />
        </div>
      </main>

      <footer className="border-t border-gray-800 text-center text-gray-600 text-xs py-4 mt-6">
        Data sourced from Pikud HaOref (Israel Home Front Command) · Tunilert
      </footer>
    </div>
  );
}
