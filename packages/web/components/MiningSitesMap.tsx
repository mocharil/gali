"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Maximize2, X, ExternalLink, Pickaxe, Copy, Check, Compass } from "lucide-react";

import { api } from "@/lib/api";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

interface MiningSitesMapProps {
  compact?: boolean;
  className?: string;
}

interface SelectedSiteInfo {
  name: string;
  slug?: string;
  commodity?: string;
  company_name?: string;
  issuer_symbol?: string;
  province?: string;
  city?: string;
  production_volume_mt?: number;
  coordinates: [number, number]; // [lon, lat]
}

export function MiningSitesMap({ compact = false, className = "" }: MiningSitesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<SelectedSiteInfo | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

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

  function handleCopyCoordinates(coords: [number, number]) {
    const text = `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
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
            `<div style="font-family:var(--font-sans), sans-serif; padding:4px 6px; min-width:190px;">
               <div style="font-weight:800; font-size:12px; color:#f8fafc;">${p.name ?? "—"}</div>
               <div style="color:#94a3b8; font-size:10px; margin-top:2px;">${p.province ?? ""} · <span style="color:#f59e0b; font-weight:700;">${p.commodity ?? ""}</span></div>
               <div style="margin-top:4px; padding-top:4px; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
                 <span style="font-family:var(--font-mono); font-weight:800; color:#38bdf8; font-size:11px;">${p.issuer_symbol ?? p.company_name ?? "—"}</span>
                 ${p.production_volume_mt ? `<span style="font-size:10px; font-family:var(--font-mono); color:#cbd5e1;">${Number(p.production_volume_mt).toFixed(1)} Mt/thn</span>` : ""}
               </div>
               <div style="font-size:9px; color:#a855f7; margin-top:3px; font-weight:600;">Klik titik untuk detail lengkap ↗</div>
             </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "sites-point", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Click event: Zoom and open Slide-over Drawer
      map.on("click", "sites-point", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        const coords = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;

        map.flyTo({
          center: coords,
          zoom: Math.max(map.getZoom(), 7.8),
          essential: true,
        });

        setSelectedSite({
          name: String(p.name ?? "Konsesi Tambang"),
          slug: p.slug ? String(p.slug) : undefined,
          commodity: String(p.commodity ?? "Coal"),
          company_name: String(p.company_name ?? ""),
          issuer_symbol: p.issuer_symbol ? String(p.issuer_symbol) : undefined,
          province: String(p.province ?? ""),
          city: p.city ? String(p.city) : undefined,
          production_volume_mt: p.production_volume_mt ? Number(p.production_volume_mt) : undefined,
          coordinates: coords,
        });
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

      {/* Floating Map Legend (Bottom-Left) */}
      {!isLoading && geojson && (
        <div className="absolute bottom-3 left-3 z-10 hidden sm:flex flex-col gap-2 rounded-xl border border-slate-800/90 bg-[#060911]/95 p-3 text-xs text-slate-300 backdrop-blur-xl shadow-2xl max-w-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
            <span>Legenda Peta</span>
            <span className="font-mono text-amber-400 font-semibold">{geojson.features.length} Situs</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span>Batubara (Coal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span>Nikel (Nickel)</span>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-1.5 space-y-1 text-[10px] text-slate-400">
            <span className="text-slate-500 font-medium block">Skala Radius (Produksi Tahunan):</span>
            <div className="flex items-center justify-between font-mono">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" /> &lt;5 Mt
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" /> 10-20 Mt
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3.5 w-3.5 rounded-full bg-amber-400" /> &gt;40 Mt
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Interactive Site Drawer (Right / Bottom) */}
      {selectedSite && (
        <div className="absolute right-3 top-3 bottom-3 z-30 w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0a0f1d]/95 p-5 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                    selectedSite.commodity === "Nickel"
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <Pickaxe className="h-3 w-3" />
                  {selectedSite.commodity}
                </span>
                {selectedSite.issuer_symbol && (
                  <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300">
                    IDX: {selectedSite.issuer_symbol}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-base font-extrabold text-white leading-snug">
                {selectedSite.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedSite(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Tutup detail situs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4 text-xs">
            {/* Coordinates Box */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Compass className="h-3.5 w-3.5 text-cyan-400" />
                  Koordinat GPS Terverifikasi
                </span>
                <button
                  onClick={() => handleCopyCoordinates(selectedSite.coordinates)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                  title="Salin Latitude, Longitude"
                >
                  {copiedCoords ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-slate-200 text-xs">
                Lat: {selectedSite.coordinates[1].toFixed(5)}, Lon: {selectedSite.coordinates[0].toFixed(5)}
              </div>
            </div>

            {/* Location & Operator info */}
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <span className="text-slate-400">Wilayah / Provinsi:</span>
                <span className="font-semibold text-slate-200 text-right">
                  {selectedSite.city ? `${selectedSite.city}, ` : ""}
                  {selectedSite.province || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-400">Perusahaan Operasi:</span>
                <span className="font-semibold text-slate-200 text-right max-w-[190px]">
                  {selectedSite.company_name || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                <span className="text-slate-400">Laju Produksi:</span>
                <span className="font-mono font-bold text-amber-400">
                  {selectedSite.production_volume_mt != null
                    ? `${selectedSite.production_volume_mt.toFixed(1)} Mt/thn`
                    : "Belum dilaporkan"}
                </span>
              </div>
            </div>

            {/* Connected IDX Issuer Card */}
            {selectedSite.issuer_symbol ? (
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-300">Emiten Induk Terdaftar</span>
                  <span className="font-mono text-sm font-black text-amber-400">
                    {selectedSite.issuer_symbol}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Konsesi tambang ini dihubungkan secara deterministik ke neraca keuangan emiten {selectedSite.issuer_symbol} di BEI melalui graf kepemilikan efektif.
                </p>
                <Link
                  href={`/issuer/${selectedSite.issuer_symbol}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg"
                >
                  <span>Analisis Fundamental {selectedSite.issuer_symbol}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-[11px] text-slate-400">
                Konsesi ini dioperasikan oleh entitas swasta non-listed di luar 9 universe emiten fokus hackathon.
              </div>
            )}
          </div>
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
