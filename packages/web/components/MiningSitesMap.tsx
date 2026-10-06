"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MapPin, X, Copy, Search, ArrowUpRight } from "lucide-react";
import type { GeoJSONFeature } from "@/lib/types";
import { api } from "@/lib/api";
import { useHydrated } from "@/lib/useHydrated";
import { issuerColor, siteColor, siteSymbols } from "@/lib/sites";
import { DataState } from "@/components/DataState";
import { GeographicSitesMap } from "@/components/GeographicSitesMap";
import { VisualAsset } from "@/components/VisualAsset";

export function MiningSitesMap({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const detailRef = useRef<HTMLDivElement>(null);
  const [mapRevision, setMapRevision] = useState(0);
  const [selected, setSelected] = useState<GeoJSONFeature | null>(null);
  const [filter, setFilter] = useState("");
  const [issuer, setIssuer] = useState("");
  const [province, setProvince] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const hydrated = useHydrated();
  const result = useQuery({ queryKey: ["sites-geojson"], queryFn: api.getSitesGeoJSON, enabled: hydrated });
  const query = {
    ...result,
    data: hydrated ? result.data : undefined,
    error: hydrated ? result.error : null,
    isLoading: !hydrated || result.isLoading,
    isError: hydrated && result.isError,
  };
  const visible = useMemo(() => (query.data?.features ?? []).filter((site) => {
    const symbols = siteSymbols(site);
    const text = `${site.properties.name} ${site.properties.company_name ?? ""} ${symbols.join(" ")} ${site.properties.province ?? ""}`.toLowerCase();
    return (!filter || text.includes(filter.trim().toLowerCase())) && (!issuer || symbols.includes(issuer)) && (!province || site.properties.province === province);
  }), [query.data, filter, issuer, province]);
  const allSymbols = [...new Set((query.data?.features ?? []).flatMap(siteSymbols))].sort();
  const allProvinces = [...new Set((query.data?.features ?? []).flatMap((site) => site.properties.province ? [site.properties.province] : []))].sort();
  const visibleSymbols = [...new Set(visible.flatMap(siteSymbols))].sort();
  const visibleProvinces = new Set(visible.flatMap((site) => site.properties.province ? [site.properties.province] : []));

  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 1279px)").matches) detailRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [selected]);

  function choose(site: GeoJSONFeature) {
    setSelected(site); setCopyMessage("");
  }
  function clearSelection() { setSelected(null); setCopyMessage(""); }
  function resetFilters() { setFilter(""); setIssuer(""); setProvince(""); clearSelection(); setMapRevision((revision) => revision + 1); }
  async function copyCoordinates() {
    if (!selected) return;
    const [lon, lat] = selected.geometry.coordinates;
    try { await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`); setCopyMessage("Coordinates copied."); }
    catch { setCopyMessage("Copy the coordinates displayed above."); }
  }
  if (query.isError) return <DataState error={query.error} onRetry={() => query.refetch()} />;

  return <div className="min-w-0 space-y-4">
    {!compact && <>
      <div className="grid grid-cols-3 gap-3" aria-label="Filtered site summary">{[{ label: "Sites", count: visible.length }, { label: "Provinces", count: visibleProvinces.size }, { label: "Related issuers", count: visibleSymbols.length }].map((item) => <div key={item.label} className="gali-card p-4"><p className="text-[12px] text-muted">{item.label}</p><p className="mt-1 font-numeric text-2xl font-semibold text-ink">{query.isLoading ? "…" : item.count}</p></div>)}</div>
      <div className="gali-card grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block text-[12px] font-medium text-muted">Search sites, provinces, or issuers<span className="relative mt-1.5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><input value={filter} onChange={(event) => { setFilter(event.target.value); clearSelection(); }} placeholder="Site name or ticker" className="gali-input pl-10" /></span></label>
        <div className="block text-[12px] font-medium text-muted"><label htmlFor="map-issuer-filter">Issuer filter</label><select id="map-issuer-filter" value={issuer} onChange={(event) => { setIssuer(event.target.value); clearSelection(); }} className="gali-input mt-1.5"><option value="">All issuers</option>{allSymbols.map((symbol) => <option key={symbol}>{symbol}</option>)}</select></div>
        <div className="block text-[12px] font-medium text-muted"><label htmlFor="map-province-filter">Province filter</label><select id="map-province-filter" value={province} onChange={(event) => { setProvince(event.target.value); clearSelection(); }} className="gali-input mt-1.5"><option value="">All provinces</option>{allProvinces.map((name) => <option key={name}>{name}</option>)}</select></div>
        <button onClick={resetFilters} disabled={!filter && !issuer && !province} className="gali-button gali-button-secondary disabled:opacity-40">Reset filter</button>
      </div>
    </>}
    <div className={`grid min-w-0 gap-4 ${compact ? "" : "xl:grid-cols-[minmax(0,1fr)_320px]"}`}>
      <div className="min-w-0 space-y-3">
        <div className={`relative overflow-hidden rounded-2xl border border-line bg-surface ${className || (compact ? "h-[280px]" : "h-[320px] sm:h-[420px]")}`} aria-label="Mining site map">
          {!query.isLoading && <GeographicSitesMap key={mapRevision} sites={visible} selected={selected} onSelect={choose} />}
          {query.isLoading && <div className="absolute inset-0 grid place-items-center bg-surface text-sm text-ink-soft" role="status">Loading sites from the dataset…</div>}
          {compact && <Link href="/map" className="absolute bottom-3 right-3 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] font-medium text-info">Open the full map →</Link>}
        </div>
        <div className="gali-card p-4"><div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Issuer legend">{visibleSymbols.map((symbol) => <span key={symbol} className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><span className="h-2.5 w-2.5 rounded-full" style={{ background: issuerColor(symbol) }} />{symbol}</span>)}</div><p className="mt-2 text-[11px] leading-relaxed text-muted">Colors follow the primary issuer; shared sites may link to several issuers. Open a group to explore its sites. Individual marker sizes reflect production when available. Country borders are not mining-license boundaries.</p></div>
      </div>
      <div className="min-w-0 space-y-3">
        {selected && <div ref={detailRef} className="relative scroll-mt-28 rounded-2xl border border-brand-line bg-surface p-4" aria-label="Selected site details">
          <button aria-label="Close site details" onClick={clearSelection} className="gali-icon-button absolute right-3 top-3"><X className="h-4 w-4" /></button>
          <p className="gali-eyebrow">Selected site</p><VisualAsset name="site-operation" className="gali-selected-site-art" /><p className="text-[10px] text-muted">Illustrative operating-site view</p><h3 className="mt-2 pr-10 text-base font-semibold text-ink">{selected.properties.name}</h3>
          <p className="mt-2 text-[12px] text-muted">{selected.properties.company_name ?? selected.properties.company_slug ?? "Operator unavailable"} · {selected.properties.province ?? "Province unavailable"}</p>
          <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[12px]"><div><dt className="text-muted">Coordinates · latitude, longitude</dt><dd className="mt-1 font-numeric text-ink-soft">{selected.geometry.coordinates[1].toFixed(6)}, {selected.geometry.coordinates[0].toFixed(6)}</dd></div><div className="flex items-center justify-between"><dt className="text-muted">Production</dt><dd className="font-numeric text-ink-soft">{selected.properties.production_volume_mt != null ? `${selected.properties.production_volume_mt.toFixed(2)} Mt/year` : "Unavailable"}</dd></div></dl>
          <div className="mt-4 flex flex-wrap gap-2">{siteSymbols(selected).map((symbol) => <Link key={symbol} href={`/issuer/${symbol}`} className="gali-button gali-button-secondary text-[12px]">Profile {symbol} →</Link>)}<button onClick={copyCoordinates} className="gali-button gali-button-secondary text-[12px]"><Copy className="h-3 w-3" />Copy coordinates</button></div>
          {!siteSymbols(selected).length && <p className="mt-3 text-[12px] text-muted">No issuer links in the dataset.</p>}
          {copyMessage && <p role="status" className="mt-3 text-[12px] text-brand">{copyMessage}</p>}
        </div>}
        <div className="gali-card overflow-hidden"><div className="border-b border-line p-4"><h2 className="text-sm font-semibold text-ink">Site list</h2><p className="mt-1 text-[12px] text-muted">{visible.length} sites match your filters. Select a site to view details.</p></div>
          <div className={`overflow-y-auto p-2 ${compact ? "max-h-40" : selected ? "max-h-72" : "max-h-[420px]"}`} aria-label="Mining site list">
            {(compact ? visible.slice(0, 4) : visible).map((site) => <button key={site.properties.slug} onClick={() => choose(site)} aria-pressed={selected?.properties.slug === site.properties.slug} className={`flex min-h-16 w-full items-start gap-3 rounded-xl p-3 text-left ${selected?.properties.slug === site.properties.slug ? "bg-brand-soft" : "hover:bg-surface-muted"}`}><MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: siteColor(site) }} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{site.properties.name}</span><span className="mt-1 block text-[12px] text-muted">{site.properties.province ?? "–"} · {siteSymbols(site).join(", ") || "Outside the universe"}</span></span><ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-subtle" /></button>)}
            {!query.isLoading && !visible.length && <p role="status" className="p-4 text-sm text-muted">{query.data?.features.length ? "No sites match your filters." : "No complete coordinates are available."}</p>}
          </div>
        </div>
      </div>
    </div>
  </div>;
}
