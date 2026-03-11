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
import { Activity } from "lucide-react";

const AlertsMap = dynamic(() => import("@/components/AlertsMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 h-[360px] animate-pulse" />
  ),
});

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");

  const [alerts, setAlerts] = useState<HistoricalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<LiveAlert | null>(null);
  const [totalStored, setTotalStored] = useState<number | null>(null);
  const [dataRange, setDataRange] = useState<{ from: string | null; to: string | null; uniqueDates: number } | null>(null);
  const [bulkFetching, setBulkFetching] = useState(false);

  // My area — shared between LiveAlertsBanner (gating sound) and any future area widget
  const [myCity, setMyCity] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("tunilert_my_city") ?? "";
    return "";
  });

  function handleCityChange(city: string) {
    setMyCity(city);
    try { localStorage.setItem("tunilert_my_city", city); } catch { /* ignore */ }
  }

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Always fetch all stored data (no date filter) so charts and map have full context.
      // Today's-only filtering is done client-side in each component.
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
        <LiveAlertsBanner onAlert={setLiveAlert} myCity={myCity} />

        {bulkFetching && (
          <p className="text-blue-400/80 text-xs animate-pulse text-center">
            Loading historical data — more records will appear shortly.
          </p>
        )}

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
