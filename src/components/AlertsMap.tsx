"use client";

import { useEffect, useRef } from "react";
import { HistoricalAlert, LiveAlert, CITY_COORDS, isRealAlert } from "@/lib/types";

interface Props {
  historicalAlerts: HistoricalAlert[];
  liveAlert: LiveAlert | null;
}

export default function AlertsMap({ historicalAlerts, liveAlert }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    import("leaflet").then((L) => {
      // Init map once
      if (!mapInstance.current) {
        // Fix default icon paths
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        mapInstance.current = L.map(mapRef.current!).setView(
          [31.5, 34.8],
          7
        );

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "© OpenStreetMap © CARTO",
            subdomains: "abcd",
            maxZoom: 19,
          }
        ).addTo(mapInstance.current);
      }

      const map = mapInstance.current;

      // Clear existing markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      // Count historical real alerts per city
      const cityCounts: Record<string, number> = {};
      historicalAlerts.filter((a) => isRealAlert(a.category)).forEach((a) => {
        const city = a.data?.trim();
        if (city) cityCounts[city] = (cityCounts[city] ?? 0) + 1;
      });

      // Live alert cities
      const liveCities = new Set(liveAlert?.data ?? []);

      Object.entries(cityCounts).forEach(([city, count]) => {
        const coords = CITY_COORDS[city];
        if (!coords) return;

        const isLive = liveCities.has(city);
        const radius = Math.min(6 + Math.log2(count + 1) * 3, 22);

        const circle = L.circleMarker(coords, {
          radius,
          fillColor: isLive ? "#ef4444" : "#f97316",
          color: isLive ? "#fca5a5" : "#fb923c",
          weight: isLive ? 2 : 1,
          opacity: 1,
          fillOpacity: isLive ? 0.9 : 0.55,
        })
          .addTo(map)
          .bindPopup(
            `<b>${city}</b><br/>${count} alert${count !== 1 ? "s" : ""}${isLive ? "<br/><span style='color:#ef4444'>⚠ ACTIVE NOW</span>" : ""}`
          );

        markersRef.current.push(circle);
      });

      // Live alert cities not in historical (new ones)
      liveCities.forEach((city) => {
        if (cityCounts[city]) return; // already drawn
        const coords = CITY_COORDS[city];
        if (!coords) return;
        const circle = L.circleMarker(coords, {
          radius: 10,
          fillColor: "#ef4444",
          color: "#fca5a5",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup(`<b>${city}</b><br/><span style='color:#ef4444'>⚠ ACTIVE NOW</span>`);
        markersRef.current.push(circle);
      });
    });
  }, [historicalAlerts, liveAlert]);

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ height: 360 }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
