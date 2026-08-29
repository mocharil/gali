"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";

// Free vector basemap tiles -- no API key required, unlike Mapbox.
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

interface MiningSitesMapProps {
  /** If true, fits Indonesia's coal belt (Kalimantan/Sumatra) instead of the whole archipelago. */
  compact?: boolean;
  className?: string;
}

export function MiningSitesMap({ compact = false, className = "" }: MiningSitesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: geojson, isLoading } = useQuery({
    queryKey: ["sites-geojson"],
    queryFn: () => api.getSitesGeoJSON(),
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [115.5, -1.5],
      zoom: compact ? 3.4 : 4.2,
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
          "circle-radius": ["interpolate", ["linear"], ["coalesce", ["get", "production_volume_mt"], 1], 0, 6, 100, 22],
          "circle-color": ["match", ["get", "commodity"], "Coal", "#f59e0b", "Nickel", "#06b6d4", "#94a3b8"],
          "circle-opacity": 0.18,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "sites-point",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["coalesce", ["get", "production_volume_mt"], 1], 0, 3, 100, 10],
          "circle-color": ["match", ["get", "commodity"], "Coal", "#f59e0b", "Nickel", "#06b6d4", "#94a3b8"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0b1120",
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, offset: 12 });
      map.on("mouseenter", "sites-point", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        popup
          .setLngLat((f.geometry as unknown as { coordinates: [number, number] }).coordinates)
          .setHTML(
            `<div style="font:12px system-ui;color:#0b1120;min-width:180px">
               <div style="font-weight:700">${p.name ?? "—"}</div>
               <div style="color:#475569">${p.province ?? ""} · ${p.commodity ?? ""}</div>
               <div style="margin-top:4px"><strong>${p.issuer_symbol ?? p.company_name ?? "—"}</strong></div>
               ${p.production_volume_mt ? `<div>Produksi: ${Number(p.production_volume_mt).toLocaleString("id-ID")} Mt/thn</div>` : ""}
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
    <div className={`relative overflow-hidden rounded-xl border border-slate-800 ${className}`}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: compact ? 280 : 520 }} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-xs text-slate-400">
          Memuat situs tambang…
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-4 text-center text-xs text-rose-300">
          Peta gagal dimuat: {loadError}
        </div>
      )}
      {!isLoading && geojson && (
        <div className="absolute bottom-3 left-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
          {geojson.features.length} situs tambang berkoordinat terverifikasi
        </div>
      )}
      {compact && (
        <Link
          href="/map"
          className="absolute right-3 top-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300 backdrop-blur hover:bg-amber-500/20"
        >
          Buka peta penuh →
        </Link>
      )}
    </div>
  );
}
