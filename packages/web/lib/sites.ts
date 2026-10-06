import type { GeoJSONFeature } from "./types";

const ISSUER_COLORS: Record<string, string> = {
  AADI: "#087185", ADMR: "#34445a", ADRO: "#b27818", BUMI: "#64758a",
  BYAN: "#a46816", DSSA: "#1f4056", GEMS: "#19665a", ITMG: "#237f91", PTBA: "#7b683d",
};

export function siteSymbols(site: GeoJSONFeature): string[] {
  return site.properties.issuer_symbols?.length ? site.properties.issuer_symbols
    : site.properties.issuer_symbol ? [site.properties.issuer_symbol] : [];
}

export function siteColor(site: GeoJSONFeature): string {
  return ISSUER_COLORS[site.properties.issuer_symbol ?? siteSymbols(site)[0] ?? ""] ?? "#64758a";
}

export function issuerColor(symbol: string): string {
  return ISSUER_COLORS[symbol] ?? "#64758a";
}

export function siteRegion(site: GeoJSONFeature): string {
  const [lon, lat] = site.geometry.coordinates;
  if (lon >= 108 && lon < 120 && lat >= -5 && lat < 8) return "Kalimantan";
  if (lon >= 94 && lon < 107 && lat >= -7 && lat < 7) return "Sumatra";
  return "Other regions";
}
