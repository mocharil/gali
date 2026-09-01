"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Maximize2 } from "lucide-react";

import { api } from "@/lib/api";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

interface MiningSitesMapProps {
  compact?: boolean;
  className?: string;
}

export function MiningSitesMap({ compact = false, className = "" }: MiningSitesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string>("all");

  const { data: geojson, isLoading } = useQuery({
    queryKey: ["sites-geojson"],
    queryFn: () => api.getSitesGeoJSON(),
  });

  function flyToRegion(region: string) {
    setActiveRegion(region);
    const map = mapRef.current;
    if (!map) return;

    if (region === "all") {
      map.flyTo({ center: [115.5, -1.5], zoom: compact ? 3.4 : 4.5, essential: true });
    } else if (region === "kalimantan") {
      map.flyTo({ center: [115.2, -1.2], zoom: 6.2, essential: true });
    } else if (region === "sumatra") {
      map.flyTo({ center: [102.5, -3.2], zoom: 6.2, essential: true });
    } else if (region === "sulawesi") {
      map.flyTo({ center: [121.5, -2.5], zoom: 6.0, essential: true });
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [115.5, -1.5],
      zoom: compact ? 3.4 : 4.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => setLoadError(String(e.error?.message ?? "map failed to load")));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    const applySource = () => {
      const sourceId = "mining-sites";
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(
          geojson as unknown as GeoJSON.FeatureCollection
        );
        return;
      }
      map.addSource(sourceId, {
        type: "geojson",
        data: geojson as unknown as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: "sites-glow",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "production_volume_mt"], 1],
            0,
            8,
            100,
            26,
          ],
          "circle-color": [
            "match",
            ["get", "commodity"],
            "Coal",
            "#f59e0b",
            "Nickel",
            "#06b6d4",
            "#94a3b8",
          ],
          "circle-opacity": 0.25,
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "sites-point",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "production_volume_mt"], 1],
            0,
            4,
            100,
            14,
          ],
          "circle-color": [
            "match",
            ["get", "commodity"],
            "Coal",
            "#f59e0b",
            "Nickel",
            "#06b6d4",
            "#38bdf8",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#060911",
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, offset: 14 });
      map.on("mouseenter", "sites-point", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        popup
          .setLngLat((f.geometry as unknown as { coordinates: [number, number] }).coordinates)
          .setHTML(
            `<div style="font-family:var(--font-sans), sans-serif; padding:2px; min-width:200px;">
               <div style="font-weight:800; font-size:13px; color:#f8fafc;">${p.name ?? "—"}</div>
               <div style="color:#94a3b8; font-size:11px; margin-top:2px;">${p.province ?? ""} · <span style="color:#f59e0b; font-weight:700;">${p.commodity ?? ""}</span></div>
               <div style="margin-top:6px; padding-top:6px; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
                 <span style="font-family:var(--font-mono); font-weight:800; color:#38bdf8; font-size:12px;">${p.issuer_symbol ?? p.company_name ?? "—"}</span>
                 ${p.production_volume_mt ? `<span style="font-size:11px; font-family:var(--font-mono); color:#cbd5e1;">${Number(p.production_volume_mt).toFixed(1)} Mt/thn</span>` : ""}
               </div>
             </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "sites-point", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    };

    if (map.isStyleLoaded()) applySource();
    else map.once("load", applySource);
  }, [geojson]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 ${className}`}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: compact ? 300 : 540 }} />

      {/* Region Quick Zoom Buttons */}
      {!compact && (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 rounded-xl border border-slate-800/80 bg-[#060911]/90 p-1 backdrop-blur-xl shadow-xl">
          <button
            onClick={() => flyToRegion("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              activeRegion === "all" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Nasional
          </button>
          <button
            onClick={() => flyToRegion("kalimantan")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              activeRegion === "kalimantan" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Kalimantan (Coal Belt)
          </button>
          <button
            onClick={() => flyToRegion("sumatra")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              activeRegion === "sumatra" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Sumatra Selatan
          </button>
          <button
            onClick={() => flyToRegion("sulawesi")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              activeRegion === "sulawesi" ? "bg-slate-800 text-cyan-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Sulawesi (Nickel Belt)
          </button>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs text-slate-300 font-medium backdrop-blur-sm">
          Memuat koordinat 52 situs tambang…
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-4 text-center text-xs text-rose-300">
          Peta gagal dimuat: {loadError}
        </div>
      )}

      {/* Bottom Information Overlay */}
      {!isLoading && geojson && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-xl border border-slate-800/80 bg-[#060911]/90 px-3.5 py-2 text-xs text-slate-300 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="font-medium">Batubara (Coal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="font-medium">Nikel (Nickel)</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="font-mono text-slate-400 text-[11px] hidden sm:inline">
            {geojson.features.length} Situs Terverifikasi GPS
          </span>
        </div>
      )}

      {compact && (
        <Link
          href="/map"
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 backdrop-blur-xl hover:bg-amber-500/20 transition-colors shadow-lg"
        >
          <Maximize2 className="h-3 w-3" /> Peta Penuh →
        </Link>
      )}
    </div>
  );
}
