"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    try { localStorage.setItem("tunilert_theme", next ? "light" : "dark"); } catch { /* ignore */ }
  }

  return (
    <button
      onClick={toggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
    >
      {light ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
