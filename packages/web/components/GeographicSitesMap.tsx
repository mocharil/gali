"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import geography from "@/lib/geography/southeast-asia.json";
import type { GeoJSONFeature } from "@/lib/types";
import { siteColor, siteRegion } from "@/lib/sites";
import { OfflineSitesMap } from "@/components/OfflineSitesMap";
import { Loader2 } from "lucide-react";
import { useActivityFlag } from "./ActivityProvider";

const NATIONAL_BOUNDS: maplibregl.LngLatBoundsLike = [[94, -11], [142, 8]];
const STYLE: StyleSpecification = {
  version: 8,
  sources: { geography: { type: "geojson", data: geography as FeatureCollection,
    attribution: '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>' } },
  layers: [
    { id: "water", type: "background", paint: { "background-color": "#edf5f8" } },
    { id: "countries", type: "fill", source: "geography", paint: {
      "fill-color": ["case", ["==", ["get", "code"], "IDN"], "#dbe8df", "#e6ece9"], "fill-opacity": 1 } },
    { id: "boundaries", type: "line", source: "geography", paint: { "line-color": "#b0c7c4", "line-width": 1.1 } },
  ],
};

function boundsFor(sites: GeoJSONFeature[]) {
  const bounds = new maplibregl.LngLatBounds();
  for (const site of sites) bounds.extend(site.geometry.coordinates as [number, number]);
  return bounds;
}

export function GeographicSitesMap({ sites, selected, onSelect }: {
  sites: GeoJSONFeature[];
  selected: GeoJSONFeature | null;
  onSelect: (site: GeoJSONFeature) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<"geographic" | "streets">("geographic");
  const [mapNotice, setMapNotice] = useState("");
  const [streetLoading, setStreetLoading] = useState(false);
  useActivityFlag(!fallback && (!ready || streetLoading), streetLoading ? "Loading street detail…" : "Preparing the geographic map…");
  const groups = useMemo(() => {
    const grouped = new Map<string, GeoJSONFeature[]>();
    for (const site of sites) {
      const name = siteRegion(site);
      grouped.set(name, [...(grouped.get(name) ?? []), site]);
    }
    return [...grouped].map(([name, members]) => ({ name, members, coordinates: [
      members.reduce((sum, site) => sum + site.geometry.coordinates[0], 0) / members.length,
      members.reduce((sum, site) => sum + site.geometry.coordinates[1], 0) / members.length,
    ] as [number, number] }));
  }, [sites]);

  useEffect(() => {
    if (!container.current || fallback) return;
    let map: maplibregl.Map | undefined;
    let resize: ResizeObserver | undefined;
    const labels: maplibregl.Marker[] = [];
    const deadline = setTimeout(() => { if (!map?.loaded()) setFallback(true); }, 10_000);
    try {
      map = new maplibregl.Map({ container: container.current, style: STYLE,
        center: [118, -2], zoom: 3.6, minZoom: 2.4, maxZoom: 13,
        dragRotate: false, pitchWithRotate: false, touchPitch: false,
        attributionControl: { compact: false }, renderWorldCopies: false });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-left");
      map.on("load", () => {
        clearTimeout(deadline);
        setReady(true);
        for (const feature of geography.features) {
          if (!["IDN", "MYS", "PHL", "PNG", "AUS"].includes(feature.properties.code)) continue;
          const label = document.createElement("span");
          label.className = "gali-map-country-label";
          label.textContent = feature.properties.name;
          label.setAttribute("aria-hidden", "true");
          labels.push(new maplibregl.Marker({ element: label })
            .setLngLat([feature.properties.label_lon, feature.properties.label_lat]).addTo(map!));
        }
      });
      resize = new ResizeObserver(() => map?.resize());
      resize.observe(container.current);
    } catch { setFallback(true); }
    return () => { clearTimeout(deadline); resize?.disconnect(); labels.forEach((label) => label.remove()); map?.remove(); mapRef.current = null; };
  }, [fallback]);

  useEffect(() => { if (selected) setRegion(siteRegion(selected)); }, [selected]);
  useEffect(() => {
    if (region && !sites.some((site) => siteRegion(site) === region)) setRegion(null);
  }, [sites, region]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (basemap === "geographic") {
      setStreetLoading(false);
      if (map.getLayer("street-detail")) map.removeLayer("street-detail");
      if (map.getSource("street-map")) map.removeSource("street-map");
      return;
    }
    const onError = (event: maplibregl.ErrorEvent) => {
      if (!("sourceId" in event) || event.sourceId !== "street-map") return;
      setMapNotice("Street tiles are unavailable. Showing bundled geography.");
      setStreetLoading(false);
      setBasemap("geographic");
    };
    const onData = (event: maplibregl.MapSourceDataEvent) => {
      if (event.sourceId === "street-map" && event.isSourceLoaded) setStreetLoading(false);
    };
    const deadline = setTimeout(() => {
      setMapNotice("Street tiles took too long to load. Showing bundled geography.");
      setStreetLoading(false); setBasemap("geographic");
    }, 15_000);
    const complete = (event: maplibregl.MapSourceDataEvent) => {
      if (event.sourceId === "street-map" && event.isSourceLoaded) { clearTimeout(deadline); onData(event); }
    };
    map.on("error", onError);
    map.on("sourcedata", complete);
    map.addSource("street-map", { type: "raster", tileSize: 256,
      tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      attribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' });
    map.addLayer({ id: "street-detail", type: "raster", source: "street-map" }, "coordinate-anchors");
    return () => { clearTimeout(deadline); map.off("error", onError); map.off("sourcedata", complete); };
  }, [basemap, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const collection = { type: "FeatureCollection", features: sites } as FeatureCollection;
    const source = map.getSource("mining-sites") as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(collection);
    else {
      map.addSource("mining-sites", { type: "geojson", data: collection });
      map.addLayer({ id: "coordinate-anchors", type: "circle", source: "mining-sites", paint: {
        "circle-color": "#087185", "circle-radius": 2, "circle-opacity": .45 } });
    }
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350;
    if (region && selected && siteRegion(selected) === region && sites.some((site) => site.properties.slug === selected.properties.slug)) {
      map.flyTo({ center: selected.geometry.coordinates as [number, number], zoom: 8.8, duration, essential: false });
    } else if (region) {
      const members = sites.filter((site) => siteRegion(site) === region);
      if (members.length) map.fitBounds(boundsFor(members), { padding: { top: 90, right: 50, bottom: 50, left: 50 }, maxZoom: 9, duration });
    } else map.fitBounds(NATIONAL_BOUNDS, { padding: { top: 65, right: 20, bottom: 35, left: 20 }, duration });
  }, [sites, selected, ready, region]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const markers: maplibregl.Marker[] = [];
    if (!region) {
      for (const group of groups) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "gali-map-cluster";
        button.setAttribute("aria-label", "Open " + group.members.length + " sites in " + group.name);
        button.dataset.testid = "map-cluster";
        button.dataset.count = String(group.members.length);
        const count = document.createElement("strong"); count.textContent = String(group.members.length);
        const label = document.createElement("span"); label.textContent = group.name;
        button.append(count, label);
        button.addEventListener("click", () => setRegion(group.name));
        markers.push(new maplibregl.Marker({ element: button }).setLngLat(group.coordinates).addTo(map));
      }
    } else {
      for (const site of sites.filter((item) => siteRegion(item) === region)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "gali-map-site";
        button.title = site.properties.name;
        button.setAttribute("aria-label", "Select " + site.properties.name);
        button.setAttribute("aria-pressed", String(selected?.properties.slug === site.properties.slug));
        button.dataset.longitude = String(site.geometry.coordinates[0]);
        button.dataset.latitude = String(site.geometry.coordinates[1]);
        button.dataset.site = site.properties.slug;
        const dot = document.createElement("span");
        const size = Math.min(12 + Math.sqrt(Math.max(site.properties.production_volume_mt ?? 0, 0)) * 2, 28);
        dot.style.width = size + "px"; dot.style.height = size + "px"; dot.style.background = siteColor(site);
        button.append(dot);
        button.addEventListener("click", () => onSelect(site));
        markers.push(new maplibregl.Marker({ element: button }).setLngLat(site.geometry.coordinates as [number, number]).addTo(map));
      }
    }
    return () => markers.forEach((marker) => marker.remove());
  }, [groups, onSelect, ready, region, selected, sites]);

  if (fallback) return <OfflineSitesMap sites={sites} selected={selected} onSelect={onSelect} />;
  return <div className="absolute inset-0" data-testid="geographic-map" data-map-engine="maplibre" data-basemap={basemap}>
    <div className="absolute inset-0" data-testid="offline-map" data-region={region ?? "Indonesia"}>
      <div ref={container} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-label="Interactive geographic map of mining sites" />
      <div className="absolute left-3 right-14 top-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-panel"><p className="text-[12px] font-semibold text-ink">{region ?? "Indonesia"}</p><p className="mt-0.5 text-[11px] text-muted">{basemap === "streets" ? "OpenStreetMap · Online detail" : "Geographic basemap"} · {region ? "Markers follow site coordinates" : "Numbers show site counts"}</p></div>
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          <button type="button" disabled={!groups.length} onClick={() => setRegion(region ? null : groups.find((group) => group.name === "Kalimantan")?.name ?? groups[0]?.name ?? null)} className="gali-button gali-button-secondary text-[12px] disabled:opacity-40">{region ? "All Indonesia" : "Focus on " + (groups.find((group) => group.name === "Kalimantan")?.name ?? groups[0]?.name ?? "region")}</button>
          <button type="button" disabled={!ready} aria-pressed={basemap === "streets"} aria-busy={streetLoading || undefined} onClick={() => { setMapNotice(""); setStreetLoading(basemap !== "streets"); setBasemap(basemap === "streets" ? "geographic" : "streets"); }} className="gali-button gali-button-secondary text-[12px] disabled:opacity-40">{streetLoading && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{basemap === "streets" ? "Bundled geography" : "Street detail"}</button>
        </div>
      </div>
      {(!ready || streetLoading) && <p role="status" className="absolute bottom-8 left-4 flex items-center gap-2 rounded-xl border border-info-line bg-surface px-3 py-2 text-[12px] text-info"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{streetLoading ? "Loading street detail…" : "Loading geographic map…"}</p>}
      {mapNotice && <p role="status" className="absolute bottom-10 left-3 right-3 w-fit rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-muted">{mapNotice}</p>}
    </div>
  </div>;
}
