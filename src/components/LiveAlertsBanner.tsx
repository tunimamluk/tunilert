"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LiveAlert, CATEGORY_LABELS } from "@/lib/types";
import { AlertTriangle, Shield } from "lucide-react";

export default function LiveAlertsBanner({
  onAlert,
}: {
  onAlert?: (alert: LiveAlert | null) => void;
}) {
  const [alert, setAlert] = useState<LiveAlert | null>(null);
  const [timeString, setTimeString] = useState<string>("");
  const mounted = useRef(false);

  const fetchAlert = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data: LiveAlert | null = await res.json();
      const now = new Date();
      setAlert(data);
      if (mounted.current) setTimeString(now.toLocaleTimeString());
      onAlert?.(data);
    } catch {
      // silently ignore fetch errors
    }
  }, [onAlert]);

  useEffect(() => {
    mounted.current = true;
    setTimeString(new Date().toLocaleTimeString());
    fetchAlert();
    const interval = setInterval(fetchAlert, 3000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [fetchAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!alert) {
    return (
      <div className="flex items-center gap-3 bg-green-950/40 border border-green-800/50 rounded-xl px-5 py-4">
        <Shield className="text-green-400 shrink-0" size={20} />
        <div>
          <span className="text-green-400 font-semibold text-sm">
            No active alerts
          </span>
          <span className="text-gray-500 text-xs ml-3">
            Updated {timeString}
          </span>
        </div>
      </div>
    );
  }

  const category = parseInt(alert.cat, 10);
  const categoryLabel = CATEGORY_LABELS[category] ?? alert.title;

  return (
    <div className="animate-pulse-once bg-red-950/70 border border-red-500/80 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="text-red-400 animate-bounce shrink-0" size={22} />
        <span className="text-red-300 font-bold text-base tracking-wide uppercase">
          {categoryLabel}
        </span>
        <span className="ml-auto text-gray-400 text-xs">
          {timeString}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {alert.data.map((city) => (
          <span
            key={city}
            className="bg-red-800/60 border border-red-600/50 text-red-100 text-sm px-3 py-1 rounded-full"
          >
            {city}
          </span>
        ))}
      </div>
      <p className="text-gray-400 text-xs mt-3">{alert.desc}</p>
    </div>
  );
}
