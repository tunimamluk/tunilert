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
import AlertsFeed from "@/components/AlertsFeed";
import { Activity, Clock } from "lucide-react";

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
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");
  const [alerts, setAlerts] = useState<HistoricalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<LiveAlert | null>(null);
  const [totalStored, setTotalStored] = useState<number | null>(null);

  const fetchHistory = useCallback(
    async (from: string, to: string, ft: string, tt: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ from, to, fromTime: ft, toTime: tt });
        const res = await fetch(`/api/history?${params}`, { cache: "no-store" });
        const json = await res.json();
        setAlerts(Array.isArray(json.results) ? json.results : []);
        setTotalStored(json.total ?? null);
      } catch {
        setAlerts([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchHistory(fromDate, toDate, fromTime, toTime);
  }, [fetchHistory, fromDate, toDate, fromTime, toTime]);

  const quickRanges = [
    { label: "Today", days: 0 },
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
  ];

  function applyQuickRange(days: number) {
    if (days === 0) {
      setFromDate(today);
    } else {
      setFromDate(format(subDays(new Date(), days), "yyyy-MM-dd"));
    }
    setToDate(today);
    setFromTime("00:00");
    setToTime("23:59");
  }

  const inputClass =
    "bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-red-600";

  return (
    <div className="min-h-screen bg-[#09090f] text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Activity className="text-red-500" size={24} />
        <h1 className="text-xl font-bold tracking-tight">
          Tuni<span className="text-red-500">lert</span>
        </h1>
        <span className="text-gray-600 text-sm ml-1">
          Israel Red Alert Statistics
        </span>
        {totalStored !== null && (
          <span className="ml-auto text-gray-600 text-xs">
            {totalStored.toLocaleString()} alerts stored
          </span>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <LiveAlertsBanner onAlert={setLiveAlert} />

        {/* Filters */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/20 p-4 space-y-3">
          {/* Date row */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-gray-500 text-xs uppercase tracking-widest w-10">Date</span>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 text-sm">From</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
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
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 ml-1">
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
          </div>

          {/* Time row */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-gray-500 text-xs uppercase tracking-widest w-10 flex items-center gap-1">
              <Clock size={12} /> Time
            </span>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 text-sm">From</label>
              <input
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 text-sm">To</label>
              <input
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              onClick={() => { setFromTime("00:00"); setToTime("23:59"); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              All day
            </button>
            <button
              onClick={() => { setFromTime("06:00"); setToTime("12:00"); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              Morning
            </button>
            <button
              onClick={() => { setFromTime("12:00"); setToTime("18:00"); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              Afternoon
            </button>
            <button
              onClick={() => { setFromTime("18:00"); setToTime("23:59"); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              Evening
            </button>
            <button
              onClick={() => { setFromTime("00:00"); setToTime("06:00"); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              Night
            </button>
            {isLoading && (
              <span className="text-gray-500 text-sm animate-pulse ml-2">
                Loading…
              </span>
            )}
          </div>
        </div>

        <StatsCards alerts={alerts} isLoading={isLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <AlertsMap historicalAlerts={alerts} liveAlert={liveAlert} />
            <RegionBreakdown alerts={alerts} isLoading={isLoading} />
          </div>
          <AlertsFeed alerts={alerts} isLoading={isLoading} />
        </div>

        <HistoryChart
          alerts={alerts}
          fromDate={fromDate}
          toDate={toDate}
          isLoading={isLoading}
        />

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
