"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import geography from "@/lib/geography/southeast-asia.json";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { siteColor, siteRegion, siteSymbols } from "@/lib/sites";
import type { GeoJSONFeature } from "@/lib/types";

const countries = (geography as FeatureCollection<Polygon | MultiPolygon>).features;
const mercator = (latitude: number) => 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
const projectionScale = 900 / 48;
const xy = ([lon, lat]: number[]) => [40 + (lon - 94) * projectionScale, 30 + (mercator(8) - mercator(lat)) * projectionScale];
const countryPath = (geometry: Polygon | MultiPolygon) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map((ring) => ring.map((point, index) => (index ? "L" : "M") + xy(point).map((value) => value.toFixed(2)).join(",")).join("") + "Z")).join("");
};
function markerPositions(sites: GeoJSONFeature[]) {
  return new Map(sites.map((site) => {
    const [x, y] = xy(site.geometry.coordinates);
    return [site.properties.slug, { x, y, ax: x, ay: y }];
  }));
}

/** Geographic fallback for devices without WebGL, using the same Natural Earth geometry. */
export function OfflineSitesMap({ sites, selected, onSelect }: { sites: GeoJSONFeature[]; selected: GeoJSONFeature | null; onSelect: (site: GeoJSONFeature) => void }) {
  const [region, setRegion] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);
  useEffect(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, [region]);
  useEffect(() => { if (selected) setRegion(siteRegion(selected)); }, [selected]);
  const groups = useMemo(() => {
    const grouped = new Map<string, GeoJSONFeature[]>();
    for (const site of sites) { const name = siteRegion(site); grouped.set(name, [...(grouped.get(name) ?? []), site]); }
    return [...grouped].map(([name, members]) => ({ name, members, x: members.reduce((sum, site) => sum + xy(site.geometry.coordinates)[0], 0) / members.length, y: members.reduce((sum, site) => sum + xy(site.geometry.coordinates)[1], 0) / members.length }));
  }, [sites]);
  useEffect(() => { if (region && sites.length && !sites.some((site) => siteRegion(site) === region)) setRegion(null); }, [region, sites]);
  const regionalSites = region ? sites.filter((site) => siteRegion(site) === region) : sites;
  const ordered = [...regionalSites].sort((a, b) => Number(a.properties.slug === selected?.properties.slug) - Number(b.properties.slug === selected?.properties.slug));
  const positions = useMemo(() => markerPositions(regionalSites), [regionalSites]);
  const regional = region !== null;
  const viewBox = !regional ? "0 0 980 450" : region === "Kalimantan" ? "305 85 260 235" : region === "Sumatra" ? "100 70 205 270" : "0 0 980 450";
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
  const adjustedViewBox = [vx + vw / 2 - vw / (2 * zoom) + offset.x, vy + vh / 2 - vh / (2 * zoom) + offset.y, vw / zoom, vh / zoom].join(" ");
  return <div className="absolute inset-0" data-testid="offline-map" data-region={region ?? "Indonesia"}>
    <svg viewBox={adjustedViewBox} className="h-full w-full touch-none" role="group" aria-label="Geographic map of Indonesia with interactive mining sites"
      onPointerDown={(event) => {
        if ((event.target as Element).closest('[role="button"]')) return;
        drag.current = { x: event.clientX, y: event.clientY, offset };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const box = event.currentTarget.getBoundingClientRect();
        const scale = Math.max(vw / zoom / box.width, vh / zoom / box.height);
        setOffset({ x: drag.current.offset.x - (event.clientX - drag.current.x) * scale, y: drag.current.offset.y - (event.clientY - drag.current.y) * scale });
      }}
      onPointerUp={(event) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { drag.current = null; }}>
      <defs><radialGradient id="map-ocean"><stop stopColor="var(--map-water)" /><stop offset="1" stopColor="var(--map-water-edge)" /></radialGradient><pattern id="map-grid" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M 45 0 L 0 0 0 45" fill="none" stroke="var(--line)" strokeWidth=".4" /></pattern></defs>
      <rect x="-100" y="-100" width="1300" height="700" fill="url(#map-ocean)" /><rect x="-100" y="-100" width="1300" height="700" fill="url(#map-grid)" />
      <path d={`M 0 ${xy([100,0])[1]} H 980`} stroke="var(--line-strong)" strokeDasharray="5 5" strokeWidth=".7" />
      {countries.map((country) => <path key={country.properties?.code} d={countryPath(country.geometry)} fill={country.properties?.code === "IDN" ? "#dbe8df" : "#e6ece9"} stroke="var(--map-land-border)" strokeWidth=".8" fillRule="evenodd" />)}
      {!regional && countries.filter((country) => ["IDN", "MYS", "PHL", "PNG"].includes(country.properties?.code)).map((country) => <text key={country.properties?.code} x={xy([country.properties?.label_lon, country.properties?.label_lat])[0]} y={xy([country.properties?.label_lon, country.properties?.label_lat])[1]} fill="var(--map-label)" fontSize="9" textAnchor="middle">{country.properties?.name}</text>)}
      {!regional ? groups.map((group) => <g key={group.name} role="button" tabIndex={0} aria-label={`Open ${group.members.length} sites in ${group.name}`} data-testid="map-cluster" data-count={group.members.length} onClick={() => setRegion(group.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setRegion(group.name); } }} className="cursor-pointer outline-none focus:[&>circle]:stroke-gold">
        <circle cx={group.x} cy={group.y} r="30" fill="var(--ink)" fillOpacity=".08" /><circle cx={group.x} cy={group.y} r="22" fill="var(--ink)" stroke="white" strokeWidth="2" /><text x={group.x} y={group.y+5} fill="white" fontSize="16" fontWeight="700" textAnchor="middle">{group.members.length}</text>
      </g>) : ordered.map((site) => {
        const { x,y,ax,ay } = positions.get(site.properties.slug)!;
        const active = selected?.properties.slug === site.properties.slug;
        const color = siteColor(site);
        const radius = Math.min(3.5 + Math.sqrt(Math.max(site.properties.production_volume_mt ?? 0, 0)) * .55, 7);
        return <g key={site.properties.slug}>
          <title>{site.properties.name} · {siteSymbols(site).join(", ")} · {site.properties.production_volume_mt?.toFixed(1) ?? "–"} Mt</title>
          <line x1={ax} y1={ay} x2={x} y2={y} stroke={color} strokeWidth=".7" opacity=".5" pointerEvents="none" /><circle cx={ax} cy={ay} r="1.2" fill={color} pointerEvents="none" />
          <circle cx={x} cy={y} r={radius+5} fill={color} opacity={active ? .25 : .08} pointerEvents="none" />
          <circle cx={x} cy={y} r={radius} fill={color} stroke={active ? "var(--ink)" : "white"} strokeWidth={active ? 2 : .9} pointerEvents="none" />
          <circle cx={x} cy={y} r="12" fill="transparent" role="button" tabIndex={0} aria-label={`Select ${site.properties.name}`} onClick={() => onSelect(site)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(site); } }} className="cursor-pointer outline-none focus:stroke-ink focus:stroke-[1.5px]" />
        </g>;
      })}
    </svg>
    <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
      <div className="rounded-xl border border-line bg-surface px-3 py-2"><p className="text-[12px] font-semibold text-ink">{region ?? "Indonesia"}</p><p className="mt-0.5 text-[11px] text-muted">{regional ? "Markers follow site coordinates" : "Numbers = site counts"} · Geographic basemap</p></div>
      <button onClick={() => setRegion(regional ? null : "Kalimantan")} className="gali-button gali-button-secondary pointer-events-auto text-[12px]">{regional ? "All Indonesia" : "Focus on Kalimantan"}</button>
    </div>
    <div className="absolute bottom-3 right-3 flex gap-1"><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(8, value * 1.5))} className="gali-icon-button">+</button><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(1, value / 1.5))} className="gali-icon-button">−</button></div>
    <p className="absolute bottom-2 left-3 rounded-md bg-surface px-2 py-1 text-[10px] text-muted">Natural Earth · Geographic view</p>
  </div>;
}
