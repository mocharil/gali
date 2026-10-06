"""Snapshot GALI data and Natural Earth geometry for the teaser.

Outputs (both committed, so the film builds offline):
  data/film-data.json  numbers pulled from the live GALI API
  data/geo.json        Natural Earth country outlines, Web-Mercator, simplified

Usage:
  python tools/prepare_data.py            # refresh both (needs network)
  python tools/prepare_data.py --geo-only # rebuild geometry from tools/cache
Env: GALI_API (default https://gali-api.vercel.app/v1)
"""

from __future__ import annotations

import json
import math
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / "cache"
DATA = ROOT / "data"
API = os.environ.get("GALI_API", "https://gali-api.vercel.app/v1").rstrip("/")
ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-{res}.json"

# Indonesia and its immediate neighbours are drawn from 1:10m data because the
# camera zooms into Kalimantan; the rest of Asia only appears at a wide scale.
HI_RES = {"360", "458", "096", "626", "598", "608", "702"}
CLIP = (60.0, -28.0, 162.0, 56.0)  # lon/lat window covering every camera view


def get_json(url: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"content-type": "application/json", "user-agent": "gali-teaser"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


# ── Geometry ────────────────────────────────────────────────────────────────
def atlas(res: str) -> dict:
    path = CACHE / f"countries-{res}.json"
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(ATLAS.format(res=res), path)
    return json.loads(path.read_text(encoding="utf-8"))


def decode_arcs(topo: dict) -> list[list[tuple[float, float]]]:
    (sx, sy), (tx, ty) = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def ring_coords(ring: list[int], arcs) -> list[tuple[float, float]]:
    out: list[tuple[float, float]] = []
    for idx in ring:
        pts = arcs[idx] if idx >= 0 else arcs[~idx][::-1]
        out.extend(pts if not out else pts[1:])
    return out


def polygons(geom: dict, arcs):
    if geom.get("type") == "Polygon":
        yield [ring_coords(r, arcs) for r in geom["arcs"]]
    elif geom.get("type") == "MultiPolygon":
        for poly in geom["arcs"]:
            yield [ring_coords(r, arcs) for r in poly]


def clip_ring(ring, box):
    """Sutherland–Hodgman clip of a closed lon/lat ring to a rectangle."""
    x0, y0, x1, y1 = box
    edges = [
        (lambda p: p[0] >= x0, lambda a, b: (x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0]))),
        (lambda p: p[0] <= x1, lambda a, b: (x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0]))),
        (lambda p: p[1] >= y0, lambda a, b: (a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0)),
        (lambda p: p[1] <= y1, lambda a, b: (a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1)),
    ]
    pts = ring
    for inside, cross in edges:
        if not pts:
            break
        res = []
        prev = pts[-1]
        for cur in pts:
            if inside(cur):
                if not inside(prev):
                    res.append(cross(prev, cur))
                res.append(cur)
            elif inside(prev):
                res.append(cross(prev, cur))
            prev = cur
        pts = res
    return pts


def merc(lon: float, lat: float) -> tuple[float, float]:
    lat = max(-85.0, min(85.0, lat))
    return lon, -math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))


def simplify(pts, tol):
    """Douglas–Peucker; closed rings are split at their farthest vertex first."""
    if len(pts) < 4:
        return pts
    if pts[0] == pts[-1]:
        x0, y0 = pts[0]
        far = max(range(len(pts)), key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
        if far in (0, len(pts) - 1):
            return pts
        return simplify_open(pts[: far + 1], tol)[:-1] + simplify_open(pts[far:], tol)
    return simplify_open(pts, tol)


def simplify_open(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-12
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / norm
            if d > best:
                best, idx = d, i
        if best > tol:
            keep[idx] = True
            stack.extend([(a, idx), (idx, b)])
    return [p for p, k in zip(pts, keep) if k]


def area(pts):
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2


def build_geo() -> dict:
    hi, lo = atlas("10m"), atlas("50m")
    countries = []
    for topo, use_hi in ((hi, True), (lo, False)):
        arcs = decode_arcs(topo)
        for g in topo["objects"]["countries"]["geometries"]:
            cid = str(g.get("id", "")).zfill(3)
            if (cid in HI_RES) != use_hi:
                continue
            tol, min_area = (0.012, 0.0006) if use_hi else (0.05, 0.02)
            rings, kal = [], []
            for poly in polygons(g, arcs):
                outer = clip_ring(poly[0], CLIP)
                if len(outer) < 4:
                    continue
                m = simplify([merc(*p) for p in outer], tol)
                if len(m) < 4 or area(m) < min_area:
                    continue
                lons = [p[0] for p in outer]
                lats = [p[1] for p in outer]
                # Indonesian Borneo is highlighted when the camera visits Kalimantan.
                is_kal = cid == "360" and min(lons) < 114.5 < max(lons) and min(lats) < -1 < max(lats)
                rings.append([round(v * 100) for p in m for v in p])
                kal.append(is_kal)
            if rings:
                countries.append({"id": cid, "name": g.get("properties", {}).get("name", ""), "rings": rings, "kal": kal})
    return {
        "source": "Natural Earth via world-atlas@2.0.2 (public domain); 10m for Indonesia & neighbours, 50m elsewhere",
        "projection": "Web Mercator; x = lon*100, y = -mercY(deg)*100",
        "countries": countries,
    }


# ── Data ────────────────────────────────────────────────────────────────────
def build_data() -> dict:
    issuers = get_json(f"{API}/issuers")
    details = {i["symbol"]: get_json(f"{API}/issuers/{i['symbol']}") for i in issuers}
    cost = get_json(f"{API}/cost-curve")
    sites = get_json(f"{API}/sites")
    coverage = get_json(f"{API}/coverage")
    graph = get_json(f"{API}/issuers/ADRO/graph")

    def scenario(body):
        res = get_json(f"{API}/scenario", body)
        return [
            {k: i.get(k) for k in ("symbol", "baseline_rank", "post_shock_rank", "baseline_rbv_usd", "post_shock_rbv_usd", "delta_rbv_pct")}
            for i in res["impacts"]
            if not i.get("is_partial")
        ]

    keys = (
        "symbol", "name", "data_quality", "ground_truth_score", "rli_years", "implied_life_years",
        "cash_cost_per_ton_usd", "realized_price_per_ton_usd", "unit_margin_usd", "breakeven_benchmark_price_usd",
        "license_cliff_3y", "reserve_backed_value_usd", "market_cap_idr", "weighted_cv_kcal", "top_destination", "top_destination_pct", "as_of", "run_id",
    )
    site_rows = [
        {
            "slug": f["id"],
            "name": f["properties"]["name"],
            "issuer": f["properties"].get("issuer_symbol"),
            "company": f["properties"].get("company_name"),
            "lon": f["geometry"]["coordinates"][0],
            "lat": f["geometry"]["coordinates"][1],
        }
        for f in sites["features"]
        if f.get("geometry")
    ]
    owner = {e["target"]: e["label"] for e in graph["edges"] if e["source"] == "issuer:ADRO"}
    operates = {}
    for e in graph["edges"]:
        if e["label"] == "operates":
            operates.setdefault(e["source"].split(":", 1)[1], []).append(e["target"].split(":", 1)[1])
    adro = details["ADRO"]
    return {
        "source": API,
        "as_of": adro["as_of"],
        "run_id": adro["run_id"],
        "issuers": [{k: details[i["symbol"]].get(k) for k in keys} for i in issuers],
        "cost_curve": {"benchmark_price_usd": cost["benchmark_price_usd"], "points": cost["points"]},
        "sites": site_rows,
        "adro_companies": [
            {"slug": c.split(":", 1)[1], "effective_ownership": owner[c], "sites": operates.get(c.split(":", 1)[1], [])}
            for c in owner
        ],
        "credits_used": coverage["credits_used"],
        "coverage": {m["entity"]: [m["numerator"], m["denominator"]] for m in coverage["metrics"]},
        "scenarios": {
            "price_-20": scenario({"price_shock_pct": -0.2}),
            "price_-20_china_-30": scenario({"price_shock_pct": -0.2, "destination_shocks": {"China": 0.3}}),
            "license_cliff": scenario({"price_shock_pct": 0, "license_cliff_expiry_shock": True}),
        },
    }


def main() -> None:
    DATA.mkdir(exist_ok=True)
    geo = build_geo()
    (DATA / "geo.json").write_text(json.dumps(geo, separators=(",", ":")), encoding="utf-8")
    points = sum(len(r) // 2 for c in geo["countries"] for r in c["rings"])
    print(f"geo.json: {len(geo['countries'])} countries, {points} vertices")
    if "--geo-only" not in sys.argv:
        data = build_data()
        (DATA / "film-data.json").write_text(json.dumps(data, indent=1), encoding="utf-8")
        print(f"film-data.json: {len(data['issuers'])} issuers, {len(data['sites'])} sites, as_of {data['as_of']}")


if __name__ == "__main__":
    main()
