"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LiveAlert, CATEGORY_LABELS, CITY_COORDS } from "@/lib/types";
import { AlertTriangle, Shield, Bell, BellOff, MapPin, Volume2, VolumeX } from "lucide-react";

const CITY_LIST = Object.keys(CITY_COORDS).sort((a, b) => a.localeCompare(b, "he"));

type SoundMode = "all" | "myArea" | "off";
const SOUND_LS_KEY = "tunilert_sound_mode";

interface Props {
  onAlert?: (alert: LiveAlert | null) => void;
  myCity: string;
  onCityChange: (city: string) => void;
}

export default function LiveAlertsBanner({ onAlert, myCity, onCityChange }: Props) {
  const [alert, setAlert] = useState<LiveAlert | null>(null);
  const [timeString, setTimeString] = useState<string>("");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [soundMode, setSoundModeState] = useState<SoundMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SOUND_LS_KEY);
      if (saved === "all" || saved === "myArea" || saved === "off") return saved;
    }
    return "all";
  });
  const mounted = useRef(false);
  const prevAlertId = useRef<string | null>(null);
  const soundModeRef = useRef<SoundMode>(soundMode);

  function setSoundMode(mode: SoundMode) {
    setSoundModeState(mode);
    soundModeRef.current = mode;
    try { localStorage.setItem(SOUND_LS_KEY, mode); } catch { /* ignore */ }
  }

  function playAlertSound() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    } catch { /* ignore */ }
  }

  async function sendBrowserNotification(title: string, body: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") new Notification(title, { body, icon: "/favicon.ico" });
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === "granted");
  }

  const myCityRef = useRef(myCity);
  useEffect(() => { myCityRef.current = myCity; }, [myCity]);

  const fetchAlert = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data: LiveAlert | null = await res.json();
      const now = new Date();
      setAlert(data);
      if (mounted.current) setTimeString(now.toLocaleTimeString());
      onAlert?.(data);

      const newId = data?.id ?? null;
      if (newId && newId !== prevAlertId.current) {
        prevAlertId.current = newId;

        const mode = soundModeRef.current;
        const city = myCityRef.current;
        const cityInAlert = city && data!.data.includes(city);

        const shouldSound =
          mode === "all" ||
          (mode === "myArea" && cityInAlert);

        if (shouldSound) {
          playAlertSound();
          const label = CATEGORY_LABELS[parseInt(data!.cat, 10)] ?? data!.title;
          const cities = data!.data.slice(0, 5).join(", ");
          await sendBrowserNotification(`⚠ ${label}`, cities);
        }
      } else if (!newId) {
        prevAlertId.current = null;
      }
    } catch { /* ignore */ }
  }, [onAlert]);

  useEffect(() => {
    mounted.current = true;
    setTimeString(new Date().toLocaleTimeString());
    if ("Notification" in window && Notification.permission === "granted") setNotifEnabled(true);
    fetchAlert();
    const interval = setInterval(fetchAlert, 3000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [fetchAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  const myCityActive = myCity && alert ? alert.data.includes(myCity) : false;

  const controls = (
    <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2 flex-wrap sm:justify-end justify-between">
      {/* City selector */}
      <div className="flex items-center gap-1.5">
        <MapPin size={12} className="text-gray-500 shrink-0" />
        <select
          value={myCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-red-600 max-w-[140px]"
        >
          <option value="">My area…</option>
          {CITY_LIST.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Sound mode toggle */}
      <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
        <button
          onClick={() => setSoundMode("all")}
          title="Sound for all alerts"
          className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
            soundMode === "all"
              ? "bg-orange-900/60 text-orange-300 border-r border-gray-700"
              : "bg-gray-800/50 text-gray-500 hover:text-gray-300 border-r border-gray-700"
          }`}
        >
          <Volume2 size={11} /> All
        </button>
        <button
          onClick={() => setSoundMode("myArea")}
          title="Sound only for my area"
          className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
            soundMode === "myArea"
              ? "bg-blue-900/60 text-blue-300 border-r border-gray-700"
              : "bg-gray-800/50 text-gray-500 hover:text-gray-300 border-r border-gray-700"
          }`}
        >
          <MapPin size={11} /> Area
        </button>
        <button
          onClick={() => setSoundMode("off")}
          title="Mute all sounds"
          className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
            soundMode === "off"
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
          }`}
        >
          <VolumeX size={11} /> Off
        </button>
      </div>

      {/* Browser notifications */}
      <button
        onClick={enableNotifications}
        title={notifEnabled ? "Notifications enabled" : "Enable browser notifications"}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
          notifEnabled
            ? "border-green-700/50 bg-green-950/40 text-green-400"
            : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700"
        }`}
      >
        {notifEnabled ? <Bell size={12} /> : <BellOff size={12} />}
        {notifEnabled ? "Notif on" : "Notify me"}
      </button>
    </div>
  );

  if (!alert) {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-green-950/40 border border-green-800/50 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
        <Shield className="text-green-400 shrink-0" size={20} />
        <div>
          <span className="text-green-400 font-semibold text-sm">No active alerts</span>
          <span className="text-gray-500 text-xs ml-3">Updated {timeString}</span>
          {myCity && (
            <span className="text-gray-600 text-xs ml-2">· {myCity}</span>
          )}
        </div>
        {controls}
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[parseInt(alert.cat, 10)] ?? alert.title;

  return (
    <div className="animate-pulse-once bg-red-950/70 border border-red-500/80 rounded-xl px-5 py-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <AlertTriangle className="text-red-400 animate-bounce shrink-0" size={22} />
        <span className="text-red-300 font-bold text-base tracking-wide uppercase">{categoryLabel}</span>
        <span className="text-gray-400 text-xs ml-2">{timeString}</span>
        {controls}
      </div>
      <div className="flex flex-wrap gap-2 overflow-y-auto pr-1" style={{ maxHeight: 120 }}>
        {alert.data.map((city) => (
          <span
            key={city}
            className={`text-sm px-3 py-1 rounded-full border ${
              city === myCity
                ? "bg-yellow-700/60 border-yellow-500/60 text-yellow-100 font-semibold"
                : "bg-red-800/60 border-red-600/50 text-red-100"
            }`}
          >
            {city}
            {city === myCity && " ◀ your area"}
          </span>
        ))}
      </div>
      {myCityActive && (
        <p className="text-yellow-300 text-xs font-semibold mt-2">⚠ Alert in your area!</p>
      )}
      <p className="text-gray-400 text-xs mt-2">{alert.desc}</p>
    </div>
  );
}
