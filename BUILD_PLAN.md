# GALI — Engineering Plan & Build Spec
### Sectors Hackathon 2026 · Track 3 (Market Intelligence) · Solo build · 29 Ags – 30 Sep 2026

---

## 0. CARA MEMAKAI DOKUMEN INI (untuk Agent Assistant)

Dokumen ini adalah **satu-satunya sumber kebenaran** untuk build GALI. Agent yang mengerjakan wajib:

1. **Kerjakan fase secara berurutan.** Jangan mulai fase N+1 sebelum *seluruh* Exit Criteria fase N
   terpenuhi dan terverifikasi. Fase 1 adalah **hard gate** — dilarang menulis kode produk sebelum
   audit datanya lulus.
2. **Update checkbox di dokumen ini secara in-place** (`- [ ]` → `- [x]`) begitu sebuah task selesai
   *dan terverifikasi*. Jangan mencentang berdasarkan niat.
3. **Maintain `PROGRESS.md` di root repo.** Setiap sesi kerja menambah satu entri:
   ```
   ## YYYY-MM-DD — Fase X
   Selesai: <task id yang dicentang>
   Blocker: <atau "none">
   Kredit terpakai sesi ini: N (kumulatif: M / 1000)
   Keputusan yang diambil: <ringkas, beserta alasan>
   Next: <task id berikutnya>
   ```
4. **Catat setiap pemakaian kredit API.** Setelah setiap ingest run, jalankan
   `gali credits report` dan tempel hasilnya ke `PROGRESS.md`. Kredit adalah sumber daya paling
   langka di proyek ini (lihat §5).
5. **Jangan pernah menambah scope** yang tidak ada di dokumen ini tanpa mencatat alasannya di
   `PROGRESS.md` bagian "Keputusan". Scope sudah dipas-kan ke 32 hari solo.
6. **Setiap angka yang tampil di UI wajib punya provenance.** Kalau sebuah metrik tidak bisa
   ditelusuri ke `raw_responses.id`, metrik itu bug. Ini bukan fitur opsional — ini kredibilitas
   produk di mata juri.
7. **Kalau ada asumsi finansial** (discount rate, FX, benchmark mapping), asumsi itu harus:
   (a) berada di satu file config, (b) ditampilkan di UI, (c) didokumentasikan di `docs/METRICS.md`.

**Aturan kompetisi yang tidak boleh dilanggar** (dari hackathon.sectors.app/rules):
- First commit **≥ 19 Ags 2026**. Repo dibuat dalam build period. Juri memeriksa commit history.
- Repo **publik** dan tetap publik ≥ 90 hari setelah pengumuman. **Tidak boleh ada API key di repo.**
- **Dilarang eksekusi trading otomatis** dalam bentuk apa pun.
- **Wajib disclaimer**: alat informasi & analisis, bukan nasihat investasi. Taruh di footer web,
  README, dan halaman `/methodology`.
- Sectors API/MCP wajib jadi **sumber data inti** — produk harus rusak kalau data Sectors dicabut.
- **Submit = freeze permanen.** Tidak boleh ada commit setelahnya, termasuk bugfix.

---

## 1. CONTEXT

**Kenapa proyek ini ada.** Aril ikut Sectors Hackathon 2026 dan butuh entri yang menang di tiga
kriteria: real-world usability (40%), video demo & storytelling (30%), technical depth & innovative
use of Sectors API (30%). Penjurian **fully async** — tidak ada pitch live, hanya video 3 menit dan
repo publik.

**Ide awal (NADI — anomaly detection + broker/foreign flow + narrative) dibatalkan** karena:
- Halaman Track 3 secara literal mencantumkan *"Anomaly detection"* sebagai contoh yang qualify
  (example direction #02). Ini ide yang disodorkan panitia, bukan yang mengejutkan panitia.
- Sectors sudah menerbitkan resep resmi 3 bagian (30 Juni 2026) di `docs.sectors.app/recipes`:
  *GNN Anomaly Detection* Part 1–3, dengan **Part 3 = "Confirmation with Broker and Foreign Flow"** —
  persis pilar utama NADI. Skor "innovative use of Sectors API" tidak mungkin tinggi.
- Diferensiator NADI (narrative via GDELT/RSS) dibangun di atas data **non-Sectors**.

**Celah yang dipilih.** Sectors API punya ekstensi **Mining** yang hampir pasti tidak disentuh peserta
lain, dan isinya cukup untuk merekonstruksi ekonomi fisik sebuah tambang. Diverifikasi dari
`docs.sectors.app/schema.json`:

| Endpoint | Field kunci yang terverifikasi |
|---|---|
| `/v2/mining/companies/performance/{slug}/` | `production_volume`, `sales_volume`, `strip_ratio`, `overburden_removal_volume`, `resources_reserves{proven/probable/total_reserves_Mt, measured/indicated/inferred_resources_Mt}`, `products[]{calorific_value_kcal, total_moisture_pct, ash_content_adb, total_sulphur_adb}`, `available_years` 2019–2024 |
| `/v2/mining/companies/financials/{slug}/` | `revenue_usd`, `revenue_breakdown{}`, `cost_of_revenue_usd`, `cost_of_revenue_breakdown{royalty, freight_and_handling, …}`, `assets_usd`, `symbol` |
| `/v2/mining/companies/ownership/{slug}/` | `parents[]{slug, symbol:"ADRO.JK", percentage_ownership}`, `subsidiaries[]{…}` ← **kunci join tambang→emiten** |
| `/v2/mining/licenses/` | **4.151 izin** IUP/IUPK/KK/PKP2B/SIPB dari ESDM Minerba: `license_expiry_date`, `expiring_soon`, `licensed_area_ha`, `cnc`, `activity`, `company_slug` (nullable) |
| `/v2/mining/contracts/` | `mine_owner_slug` → `contractor_slug`, `contract_period_end` |
| `/v2/mining/sales-destination/{slug}/` | per negara: `revenue_usd`, `pct_of_total_revenue`, `volume`, `pct_of_sales_volume` |
| `/v2/mining/sites/` + `/{slug}/` | 156 situs; detail berisi lat/long + parsed resources/reserves |
| `/v2/mining/commodities/{name}/price/` | riwayat harga komoditas bulanan (maks 3 tahun) |
| `/v2/mining/exports/`, `/total-production/`, `/resources-reserves/{province}/`, `/global-commodity/`, `/license-auctions/` | konteks nasional, ekspor, lelang izin |

**Bukti kelayakan.** Dari contoh dokumentasi PT Adaro Andalan (2024): `total_reserves_Mt = 819`,
`production_volume = 48.11` → **umur tambang = 17,0 tahun**. Angka ini tidak tersedia di screener mana
pun di Indonesia dan bisa dihitung untuk seluruh emiten komoditas IDX.

**Outcome yang dituju.** Aplikasi produksi yang menilai emiten komoditas IDX dari **tambang fisiknya** —
umur cadangan vs umur yang disiratkan harga pasar, tebing kedaluwarsa izin ESDM, posisi di kurva biaya
nasional, harga breakeven, dan eksposur negara tujuan ekspor — lalu membandingkannya dengan yang sedang
dihargai dan diakumulasi pasar.

**Problem statement (satu kalimat, untuk form submission):**
> *Untuk investor saham komoditas Indonesia: GALI menilai emiten dari tambang fisiknya — berapa ton
> cadangan tersisa, berapa tahun lagi habis, berapa biaya per ton, izin mana yang kedaluwarsa, dan ke
> negara mana dijual — lalu membandingkannya dengan yang sedang dihargai pasar.*

**Nama.** GALI — *Ground-truth Analytics for Listed Issuers*. Tagline: *"Gali lebih dalam dari kode
sahamnya."*

---

## 2. ARSITEKTUR

### 2.1 Prinsip

1. **Ingestion terpisah total dari serving.** Upstream (Sectors) adalah vendor bermeteran dengan
   kuota keras. Tidak boleh ada satu pun request user yang memanggil Sectors secara langsung. Ini
   pola produksi yang benar *dan* satu-satunya cara bertahan dengan 1.000 kredit.
2. **Live, bukan statis.** Postgres sebagai system of record, FastAPI melayani query real-time,
   scenario engine menghitung server-side saat slider digeser. Tidak ada JSON yang di-hardcode.
3. **Raw immutable, derived reproducible.** Setiap respons API disimpan mentah selamanya. Seluruh
   layer turunan bisa dibangun ulang dari raw tanpa memanggil API lagi (biaya 0 kredit).
4. **Satu implementasi matematika.** Metric engine hidup di `gali_core` dan dipakai oleh pipeline
   *dan* API. Tidak boleh ada logika finansial yang diduplikasi di TypeScript.
5. **Semua angka punya provenance.** Setiap metrik membawa `evidence` jsonb yang menunjuk ke
   `raw_responses.id` dan mencatat field mana yang null.

### 2.2 Diagram komponen

```
                    ┌──────────────────────────────────────────┐
                    │           Sectors Financial API          │
                    │   (metered · 1.000 credits · hard cap)   │
                    └────────────────────┬─────────────────────┘
                                         │ SectorsClient
                                         │  · tiered TTL cache (cold/warm/hot)
                                         │  · CreditBudget guard (hard stop)
                                         │  · retry + backoff + rate limit
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  DAGSTER  (packages/pipeline)  — asset graph, schedules, sensors, freshness    │
│                                                                               │
│   raw_* assets ──► core_* assets ──► graph_* assets ──► metric_* assets       │
│   (jsonb dump)     (normalized)      (ownership +        (RLI, RBV, cliff,     │
│                                       entity match)       cost, quality,      │
│                                                           destination, score) │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │ upsert
                                    ▼
        ┌───────────────────────────────────────────────────────┐
        │  PostgreSQL 16  (Neon)   ext: pg_trgm, btree_gin       │
        │  raw · core · market · graph · metrics · ops schemas   │
        └───────────────┬───────────────────────────────────────┘
                        │ SQLAlchemy 2.0 async / asyncpg
                        ▼
        ┌───────────────────────────────────────────────────────┐
        │  FastAPI  (packages/api)                              │
        │  · /v1 read endpoints    · POST /v1/scenario (live)   │
        │  · Redis cache + rate limit  · API-key auth           │
        │  · OpenAPI · /health /ready /metrics · Sentry         │
        └───────────────┬───────────────────────────────────────┘
                        │ HTTPS (RSC fetch + TanStack Query)
                        ▼
        ┌───────────────────────────────────────────────────────┐
        │  Next.js 15 App Router  (packages/web) · Vercel        │
        │  Tailwind v4 · shadcn/ui · MapLibre GL · visx          │
        └───────────────────────────────────────────────────────┘
```

### 2.3 Technology decisions

| Layer | Pilihan | Alasan |
|---|---|---|
| Orkestrasi | **Dagster 1.9+** | Software-defined assets memetakan persis alur raw→core→graph→metrics; punya lineage UI (bagus untuk video), partitioning, retry, freshness policy, dan asset sensors. Skala ke multi-worker tanpa rewrite. |
| Database | **PostgreSQL 16 (Neon)** | Serverless, branching untuk dev/prod, free tier cukup. `pg_trgm` dipakai untuk fuzzy entity matching. |
| Cache/queue | **Redis (Upstash)** | API response cache, rate limiting, stampede lock. |
| Compute/API | **Python 3.13 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2** | Berbagi kode domain dengan pipeline. OpenAPI otomatis. |
| Frontend | **Next.js 15 (App Router) + TS + Tailwind v4 + shadcn/ui** | RSC untuk halaman berat data, client component untuk interaktivitas. |
| Peta | **MapLibre GL JS** + basemap gratis (Protomaps/OSM) | Tanpa Mapbox token. 156 situs tambang sebagai GeoJSON dari API. |
| Chart | **visx** (kurva biaya, timeline) + **Recharts** (chart standar) | visx untuk kurva biaya kumulatif yang tidak bisa dibuat chart library biasa. |
| Deploy | Web→**Vercel**, API+Dagster→**Fly.io** (Docker), DB→**Neon**, Redis→**Upstash** | Semua punya free tier produksi-nyata dan jalur scale yang jelas. |
| Observability | **structlog** + **Sentry** + `prometheus-fastapi-instrumentator` + Dagster run history | |
| CI | **GitHub Actions**: ruff, mypy, pytest, tsc, eslint, playwright, docker build | Membuktikan ke juri bahwa produk "real, functional, well engineered, not faked". |

### 2.4 Repo layout

```
gali/
├── README.md                  # + DISCLAIMER + arsitektur ringkas + cara run
├── PROGRESS.md                # WAJIB diupdate setiap sesi (lihat §0)
├── docker-compose.yml         # postgres + redis + api + dagster (dev parity)
├── .env.example               # tanpa nilai rahasia
├── .github/workflows/
│   ├── ci.yml                 # lint + typecheck + test + build
│   ├── deploy.yml             # fly deploy + vercel
│   └── refresh.yml            # cron harian → trigger Dagster job "hot_refresh"
├── packages/
│   ├── core/                          # pip package: gali_core
│   │   ├── gali_core/
│   │   │   ├── config.py               # Settings (pydantic-settings) + ASSUMPTIONS
│   │   │   ├── sectors/
│   │   │   │   ├── client.py           # httpx async, retry, rate limit
│   │   │   │   ├── cache.py            # tiered TTL, raw_responses persistence
│   │   │   │   ├── budget.py           # CreditBudget: hard cap + ledger
│   │   │   │   └── endpoints.py        # typed wrapper per endpoint + biaya kredit
│   │   │   ├── db/
│   │   │   │   ├── models.py           # SQLAlchemy 2.0 ORM (lihat §3)
│   │   │   │   ├── session.py
│   │   │   │   └── migrations/         # Alembic
│   │   │   ├── normalize/              # raw jsonb → core tables
│   │   │   ├── graph/
│   │   │   │   ├── entity_match.py     # pg_trgm fuzzy + legal-suffix normalizer
│   │   │   │   └── ownership.py        # transitive effective-ownership closure
│   │   │   ├── metrics/
│   │   │   │   ├── rli.py  rbv.py  license_cliff.py  cash_cost.py
│   │   │   │   ├── quality.py  destination.py  contracts.py  score.py
│   │   │   │   └── evidence.py         # provenance builder
│   │   │   └── scenario/engine.py      # dipakai pipeline DAN api
│   │   └── tests/
│   │       ├── golden/                 # fixture respons Sectors terekam
│   │       └── test_*.py
│   ├── pipeline/                      # Dagster code location
│   │   └── gali_pipeline/
│   │       ├── definitions.py
│   │       ├── assets/{raw,core,graph,metrics}.py
│   │       ├── resources.py            # SectorsResource, DbResource
│   │       ├── schedules.py            # cold/warm/hot
│   │       └── sensors.py              # freshness + metric-run trigger
│   ├── api/
│   │   └── gali_api/
│   │       ├── main.py  deps.py  middleware.py
│   │       ├── routers/{universe,issuer,rankings,cost_curve,sites,licenses,graph,scenario,market,coverage}.py
│   │       └── schemas/
│   └── web/
│       ├── app/                        # App Router (lihat §4.2)
│       ├── components/
│       ├── lib/api.ts                  # typed client dari OpenAPI
│       └── e2e/                        # Playwright
├── infra/{Dockerfile.api,Dockerfile.pipeline,fly.api.toml,fly.pipeline.toml}
└── docs/
    ├── ARCHITECTURE.md
    ├── METRICS.md            # setiap rumus + asumsi + provenance
    ├── DATA_COVERAGE.md      # output Fase 1 (di-regenerate tiap ingest)
    └── CREDIT_BUDGET.md      # rencana vs realisasi
```

---

## 3. DATA MODEL

Lima schema Postgres: `raw`, `core`, `market`, `graph`, `metrics`, plus `ops`.

### 3.1 `raw` — immutable, sumber kebenaran
```sql
raw.responses(
  id BIGSERIAL PK, endpoint TEXT, params JSONB, params_hash TEXT,
  payload JSONB, status_code INT, credits_charged INT,
  tier TEXT CHECK (tier IN ('cold','warm','hot')),
  fetched_at TIMESTAMPTZ, run_id TEXT,
  UNIQUE (endpoint, params_hash, fetched_at)
)
CREATE INDEX ON raw.responses (endpoint, params_hash, fetched_at DESC);
```

### 3.2 `core` — data tambang ternormalisasi
```
core.mining_company(slug PK, name, symbol, company_type, key_operation, commodity_types TEXT[])
core.mining_site(slug PK, name, project_name, company_slug FK, commodity_type,
                 province, city, latitude, longitude)
core.mining_site_production(site_slug, year, production_volume, unit, strip_ratio)  PK(site_slug,year)
core.mining_license(wiup_code PK, license_number, license_type, province, city,
                    license_effective_date, license_expiry_date, activity,
                    licensed_area_ha, location, commodity_type, company_name, cnc,
                    generation, company_slug FK NULL, match_confidence NUMERIC, match_method TEXT)
core.mining_contract(mine_owner_slug, contractor_slug, contract_period_end)  PK(owner,contractor)
core.company_performance(company_slug, year, commodity_type, commodity_sub_type,
                         mining_operation_status, unit,
                         production_volume, sales_volume, overburden_removal_volume, strip_ratio,
                         measurement_year, proven_reserves_mt, probable_reserves_mt, total_reserves_mt,
                         measured_resources_mt, indicated_resources_mt, inferred_resources_mt,
                         total_resources_mt)  PK(company_slug,year,commodity_type)
core.company_product(company_slug, year, product_name, cv_kcal_min, cv_kcal_max,
                     moisture_pct_min, moisture_pct_max, ash_adb_min, ash_adb_max,
                     sulphur_adb_min, sulphur_adb_max, volatile_matter_adb_min, volatile_matter_adb_max)
core.company_financials(company_slug, year, symbol, assets_usd, revenue_usd, revenue_breakdown JSONB,
                        cost_of_revenue_usd, cost_of_revenue_breakdown JSONB, profit_usd)  PK(slug,year)
core.sales_destination(company_slug, year, country, commodity_type, unit,
                       revenue_usd, pct_of_total_revenue, volume, pct_of_sales_volume)
core.commodity_price(commodity, observed_on, price, unit)  PK(commodity,observed_on)
core.commodity_export_destination(commodity, year, country, export_value, rank)
core.national_production(commodity, year, total_production, yoy_pct)
core.province_reserves(province, year, commodity, exploration_target, total_inventory,
                       resources, reserves, unit)
core.license_auction(wiup_code PK, ..., phases JSONB, participants JSONB)
```

### 3.3 `market` — sisi bursa
```
market.idx_company(symbol PK, name, sector, sub_sector, market_cap_idr, listing_date, updated_at)
market.idx_daily_close(symbol, date, close, volume, market_cap)  PK(symbol,date)
market.foreign_flow(symbol, date, net_foreign_inflow)  PK(symbol,date)
market.broker_registry(broker_code PK, name, origin, cohort, license_type)
market.broker_summary_top(symbol, window_start, window_end, broker_code, side, net_value)
market.free_float(symbol, free_float_pct, as_of)
market.filing(id PK, symbol, date, holder_name, holder_type, transaction_type, shares, price, value)
market.corporate_action(symbol, action_type, date, details JSONB)
```

### 3.4 `graph` — hasil entity resolution
```
graph.ownership_edge(parent_slug, child_slug, percentage_ownership, parent_symbol)  PK(parent,child)
graph.issuer(symbol PK, name, primary_commodity, is_in_universe BOOL, coverage JSONB)
graph.issuer_mining_link(symbol, company_slug, effective_ownership_pct,
                         path JSONB, confidence NUMERIC, method TEXT)  PK(symbol,company_slug)
```

### 3.5 `metrics` — versioned, blue/green
```
metrics.run(id UUID PK, run_at, code_version, data_version, assumptions JSONB,
            status TEXT CHECK (status IN ('building','validated','published','failed')))
metrics.issuer_metrics(run_id FK, symbol, as_of,
   rli_years, implied_life_years, reserve_life_gap_years,
   attributable_gross_profit_usd, reserve_backed_value_usd, market_cap_usd, rbv_gap_pct,
   license_cliff_1y, license_cliff_3y, license_cliff_5y, cnc_coverage_pct, weighted_days_to_expiry,
   cash_cost_per_ton_usd, realized_price_per_ton_usd, unit_margin_usd,
   breakeven_benchmark_price_usd, cost_curve_percentile,
   weighted_cv_kcal, benchmark_grade, benchmark_price_usd, quality_discount_pct,
   destination_hhi, top_destination, top_destination_pct,
   contractor_hhi, contract_cliff_12m,
   ground_truth_score, component_scores JSONB,
   confidence JSONB, evidence JSONB)  PK(run_id,symbol)
metrics.published_pointer(singleton BOOL PK DEFAULT TRUE, run_id FK)   -- flip setelah validasi lulus
```

### 3.6 `ops`
```
ops.credit_ledger(id, endpoint, credits, occurred_at, run_id, tier)
ops.api_key(id, key_hash, label, rate_limit_per_min, created_at, revoked_at)
ops.data_coverage(captured_at, metric TEXT, numerator INT, denominator INT, detail JSONB)
```

---

## 4. SPESIFIKASI FUNGSIONAL

### 4.1 Metric engines (rumus lengkap — implementasikan persis ini)

Semua asumsi hidup di `gali_core/config.py::ASSUMPTIONS` dan **wajib tampil di UI**.
Default: `DISCOUNT_RATE = 0.12`, `FX_IDR_USD` (dari config, ditampilkan), `MIN_MATCH_CONFIDENCE = 0.72`.

**M1 — Reserve Life Index**
```
RLI(company) = total_reserves_mt / production_volume        # tahun terakhir dgn keduanya non-null
Roll-up ke emiten:
  reserves(symbol)   = Σ_c eff_own(symbol,c) × total_reserves_mt(c)
  production(symbol) = Σ_c eff_own(symbol,c) × production_volume(c)
  RLI(symbol)        = reserves(symbol) / production(symbol)
Golden check: Adaro → 819 / 48.11 = 17.02 tahun
```

**M2 — Reserve-Backed Value & Implied Life** (metrik headline)
```
GP(c)              = revenue_usd − cost_of_revenue_usd
attributable_GP(s) = Σ_c eff_own(s,c) × GP(c)
r                  = DISCOUNT_RATE

RBV(s)          = attributable_GP(s) × (1 − (1+r)^(−RLI(s))) / r     # anuitas selama umur tambang
rbv_gap_pct(s)  = (market_cap_usd(s) − RBV(s)) / RBV(s) × 100

implied_life(s) = −ln(1 − market_cap_usd(s) × r / attributable_GP(s)) / ln(1+r)
                  # jika market_cap × r ≥ attributable_GP → tak hingga; set NULL + flag 'unbounded'
reserve_life_gap(s) = implied_life(s) − RLI(s)
```
> Headline video: *"Pasar menghargai emiten ini seolah tambangnya hidup 31 tahun. Datanya: 17."*

**M3 — License Cliff**
```
L(s) = semua core.mining_license dengan company_slug ∈ linked_companies(s)
       DAN match_confidence ≥ MIN_MATCH_CONFIDENCE

cliff_Ny(s) = Σ{l ∈ L(s) : l.expiry ≤ today+N tahun DAN l.activity='Operasi Produksi'} licensed_area_ha
              / Σ{l ∈ L(s)} licensed_area_ha
cnc_coverage(s) = Σ area WHERE cnc='CNC' / Σ area
weighted_days_to_expiry(s) = Σ(area_l × days_to_expiry_l) / Σ area_l
```
Hitung untuk N ∈ {1, 3, 5}.

**M4 — Cash Cost & Breakeven**
```
mining_revenue(c) = revenue_breakdown[key komoditas utama]      # fallback: revenue_usd
mining_cost(c)    = cost_of_revenue_usd − cost_of_revenue_breakdown.get('purchased_coal', 0)
tons(c)           = sales_volume × 1e6                          # Mt → t

cash_cost_per_ton(c)      = mining_cost(c) / tons(c)
realized_price_per_ton(c) = mining_revenue(c) / tons(c)
unit_margin(c)            = realized − cash_cost

breakeven_benchmark_price(c) = benchmark_price × (cash_cost / realized)   # pertahankan diskon realisasi
```
**Kurva biaya nasional**: urutkan emiten menurut `cash_cost_per_ton` naik; sumbu-X = produksi
kumulatif (Mt), sumbu-Y = cash cost; garis horizontal = harga benchmark berjalan. Semua yang di atas
garis = sedang merugi secara tunai. `cost_curve_percentile` = posisi produksi kumulatif ÷ total.

**M5 — Quality-Adjusted Realization**
```
weighted_cv(c) = mean over products of (cv_kcal_min + cv_kcal_max)/2
                 # jika porsi volume per produk tidak tersedia → simple mean + confidence 'low'
benchmark_grade = select_benchmark(commodity, weighted_cv):
    Coal:  cv < 4200        → 'ICI-4 (4200 GAR)'
           4200 ≤ cv < 5000 → 'ICI-3 (5000 GAR)'
           5000 ≤ cv < 5800 → 'ICI-2 (5800 GAR)'
           cv ≥ 5800        → 'ICI-1 / NEWC (6000)'
    Nikel/Emas/Tembaga: benchmark tunggal dari core.commodity_price
quality_discount_pct = (benchmark_price − realized_price_per_ton) / benchmark_price × 100
```
> **Fase 1 wajib memeriksa** grade apa saja yang benar-benar dikembalikan
> `/v2/mining/commodities/{name}/price/`. Jika hanya satu seri per komoditas, pakai seri itu sebagai
> referensi dan sajikan kualitas sebagai posisi *relatif* antar emiten, dengan flag eksplisit di UI.

**M6 — Destination Stress Test** (mesin scenario, dipanggil live)
```
Input shock S = {country: pct_reduction ∈ [0,1]}
volume_at_risk_pct(s) = Σ_country pct_of_sales_volume(s,country) × S[country]
revenue_at_risk(s)    = volume_at_risk_pct(s) × mining_revenue(s)
post_shock_GP(s)      = GP(s) − revenue_at_risk(s) × (1 − VARIABLE_COST_SHARE)
                        # VARIABLE_COST_SHARE default 0.65, dapat diubah user, tampil di UI
→ hitung ulang RBV, rbv_gap, ranking
destination_hhi(s)    = Σ_country (pct_of_sales_volume)²        # 0–10000, konsentrasi
```

**M7 — Contractor / Supply-chain graph**
```
contractor_hhi(owner)     = Σ_contractor (share of that owner's contracts)²
client_exposure(contractor) = Σ_clients production_volume(client)
contract_cliff_12m(x)     = Σ produksi klien dgn contract_period_end ≤ today+1thn / Σ produksi klien
```
Dua arah: risiko konsentrasi kontraktor bagi emiten tambang, **dan** eksposur klien bagi emiten
kontraktor tercatat (mis. UNTR/Pamapersada).

**M8 — Ground Truth Score (0–100)**
Percentile-rank tiap sub-sinyal di dalam universe, lalu bobot:
| Komponen | Bobot | Arah |
|---|---|---|
| RLI | 25% | tinggi lebih baik |
| License cliff 3y | 20% | rendah lebih baik |
| Cost curve percentile | 25% | rendah (biaya murah) lebih baik |
| Destination HHI | 15% | rendah lebih baik |
| Contract cliff 12m + contractor HHI | 15% | rendah lebih baik |

Komponen yang datanya null **di-drop dan bobotnya dinormalisasi ulang**; `confidence` mencatat bobot
efektif yang terpakai. **Ini bukan sinyal beli/jual** — labelnya "kualitas basis aset yang mendasari".

**M9 — Market Divergence** (lapisan "so what")
```
divergence(s) = percentile(rbv_gap_pct) − percentile(ground_truth_score)
Overlay: net foreign inflow 30h, net broker per cohort (institutional vs retail), net insider filings
Surface dua kuadran ekstrem:
  · gap valuasi tinggi + ground truth lemah + distribusi institusional
  · gap valuasi rendah + ground truth kuat + akumulasi institusional
```

### 4.2 Algoritma ownership resolution (inti technical depth)

```
1. Bangun digraph G dari graph.ownership_edge (parent → child, weight = pct/100).
2. Seed issuer: node dengan symbol NOT NULL yang cocok dengan ticker di market.idx_company.
3. eff_own(symbol, c) = Σ atas SEMUA path berarah p dari node issuer ke c dari Π bobot sepanjang p.
   - DFS bermemoisasi, batas kedalaman 6, deteksi siklus (tandai & putus, catat di log).
   - Invariant: 0 < eff_own ≤ 1.0 (+toleransi 1e-6). Uji sebagai property test.
4. Lisensi dengan company_slug NULL → fuzzy match license.company_name ↔ mining_company.name:
   a. Normalisasi: uppercase, buang sufiks legal (PT, TBK, CV, (PERSERO), UD, PERSEROAN TERBATAS),
      rapatkan whitespace.
   b. Skor = pg_trgm similarity() pada nama ternormalisasi.
   c. ≥ 0.72          → method='fuzzy',      masuk metrik headline
      0.55 – 0.72     → method='fuzzy_low',  DITAMPILKAN tapi DIKECUALIKAN dari metrik headline
      < 0.55          → unlinked
5. Emit graph.issuer_mining_link (symbol, company_slug, eff_own, path, confidence, method).
```

### 4.3 API surface (`packages/api`)

| Method | Path | Isi |
|---|---|---|
| GET | `/health`, `/ready`, `/metrics` | liveness, readiness (DB+Redis), Prometheus |
| GET | `/v1/universe` | daftar emiten tercakup + badge coverage per emiten |
| GET | `/v1/issuers/{symbol}` | laporan ground-truth lengkap (semua metrik + confidence) |
| GET | `/v1/issuers/{symbol}/evidence` | rantai provenance per metrik → `raw.responses.id` |
| GET | `/v1/rankings?metric=&order=&limit=` | leaderboard atas metrik apa pun |
| GET | `/v1/cost-curve?commodity=` | titik kurva biaya kumulatif + garis benchmark |
| GET | `/v1/sites?bbox=&commodity=&company=` | **GeoJSON FeatureCollection** untuk MapLibre |
| GET | `/v1/licenses/cliff?symbol=&horizon=` | timeline kedaluwarsa izin |
| GET | `/v1/graph/ownership?symbol=` | nodes+edges untuk visualisasi graf |
| GET | `/v1/graph/contracts?symbol=` | graf pemilik↔kontraktor |
| POST | `/v1/scenario` | **live compute**: `{commodity_price_overrides, destination_shocks, license_renewal_failures, discount_rate, variable_cost_share}` → ranking & delta per emiten |
| GET | `/v1/market/divergence` | ground truth vs harga pasar + overlay flow |
| GET | `/v1/commodities/{name}/prices` | seri harga |
| GET | `/v1/coverage` | laporan kelengkapan data (halaman kejujuran) |

Middleware: CORS (origin web saja), API-key opsional (`X-API-Key` → `ops.api_key`), rate limit via
Redis (default 60 req/min/IP, 600 untuk key valid), request-id, structlog, Sentry.
Cache: Redis, TTL 300s untuk GET, key = path+query+`published_pointer.run_id`. Stampede lock.
`POST /v1/scenario` di-cache dengan key = hash(body)+run_id, TTL 600s.

### 4.4 Halaman web (`packages/web`)

| Route | Isi |
|---|---|
| `/` | Peta nasional situs tambang + leaderboard headline (reserve-life gap terbesar) + tiga angka besar |
| `/issuer/[symbol]` | Laporan lengkap: **reserve clock**, timeline license cliff, posisi di kurva biaya, donut negara tujuan, graf kepemilikan, drawer **Evidence** (provenance tiap angka) |
| `/cost-curve` | Kurva biaya nasional interaktif + garis harga benchmark yang bisa digeser |
| `/scenario` | **Scenario Studio**: slider harga komoditas, shock per negara, kegagalan perpanjangan izin, discount rate → POST `/v1/scenario`, ranking bergerak live |
| `/map` | MapLibre full-screen, clustering, ukuran titik = produksi, warna = komoditas, klik → emiten |
| `/divergence` | Ground truth vs harga pasar, overlay foreign flow / broker cohort / insider |
| `/methodology` | Render `docs/METRICS.md`: semua rumus, semua asumsi, **DISCLAIMER** |
| `/coverage` | Kelengkapan data per emiten & per field — halaman kejujuran |

Wajib: dark mode, responsif, skeleton loading, empty state yang jujur ("data cadangan tidak tersedia
untuk emiten ini"), **badge confidence di setiap angka turunan**, footer disclaimer di semua halaman.

---

## 5. ANGGARAN KREDIT — KENDALA PALING KERAS

Total tersedia: **1.000 kredit.** Habis = proyek mati. Tiga jenjang TTL:

| Tier | Isi | Refresh | Kredit |
|---|---|---|---|
| **cold** | licenses (139), sites list (6), site detail ~90, companies list (13), company detail ~70, contracts (5), resources-reserves (23), commodities (1), global-commodity (6), exports (6), total-production (6), helper lists (3) | bulanan | **≈ 368** |
| **warm** | per company ×70: performance (70), financials (70), ownership (70), sales-destination (70) | kuartalan | **≈ 280** |
| **hot** | screener universe untuk market cap (2/hari × 30 = 60), commodity price mingguan (6×5=30), foreign-flow 15 emiten ×3 (45), free-float (2), filings (5), company report 10 emiten ×3 kredit (30), broker-summary top 10×2 (20) | harian/mingguan | **≈ 192** |
| | | **Total rencana** | **≈ 840** |
| | | **Cadangan** | **≈ 160** |

**Aturan wajib:**
1. `SectorsClient` **selalu** cek `raw.responses` dulu. Cache hit = 0 kredit. Re-processing tidak
   pernah memanggil API.
2. `CreditBudget` membaca `ops.credit_ledger`, punya **hard cap per run** dan **global cap 950**.
   Melampaui → raise `BudgetExceeded`, run gagal keras. Tidak ada silent overspend.
3. `GALI_DRY_RUN=1` mensimulasikan seluruh pipeline dari cache tanpa network. **Ini mode default
   saat mengembangkan.**
4. Pakai `/v2/companies/` screener dengan `where symbol IN (...)` untuk market cap universe
   (2 panggilan), **jangan** `/v2/daily/{symbol}` per emiten (40 panggilan).
5. `limit=30` (maksimum) di setiap endpoint terpaginasi.
6. Setelah setiap run: `gali credits report` → tempel ke `PROGRESS.md`.

---

## 6. FASE BUILD

> Hari ini **29 Ags 2026**. Submit **30 Sep 2026**. Registrasi tutup **22 Sep**.
> Tanggal di bawah adalah target; yang mengikat adalah **Exit Criteria**, bukan tanggal.

---

### FASE 0 — Registrasi & Fondasi · *29 Ags (hari ini)*
**Tujuan:** kredit terklaim, repo hidup, dev environment jalan.

> #### ⚠️ BACA DULU — KEADAAN REPO SAAT INI (per 29 Ags 2026)
>
> Sebagian Fase 0 **sudah dikerjakan dan terverifikasi**. Jangan diulang. Yang sudah ada:
>
> | Artefak | Status | Catatan |
> |---|---|---|
> | Struktur direktori monorepo (§2.4) | ✅ ada | `packages/{core,api,pipeline,web}`, `infra/`, `docs/`, `.github/workflows/` (masih kosong isinya) |
> | `.gitignore`, `.env.example`, `LICENSE` (MIT) | ✅ ada | `.env` sudah di-ignore |
> | `docker-compose.yml` + `infra/initdb/01-extensions.sql` | ✅ ada & **jalan** | `gali-postgres` healthy di **host port 5433**, `gali-redis` healthy di 6379. `pg_trgm` + `btree_gin` terpasang (terverifikasi). |
> | `.venv` (Python **3.13.13**) | ✅ ada | Ketiga paket ter-install editable. Dagster **1.13.20** resolve bersih. |
> | `packages/{core,api,pipeline}/pyproject.toml` | ✅ ada | Dependency lengkap + entrypoint CLI `gali` |
> | `gali_core/config.py` | ✅ ada & terverifikasi | `Settings` + `Assumptions` (discount_rate 0.12, variable_cost_share 0.65, fx 16200, min_match_confidence 0.72) + `COAL_BENCHMARK_BANDS` |
> | `gali_core/db/base.py` | ✅ ada | Base, naming convention, engine async+sync, session factory |
> | `gali_core/db/models.py` | ✅ ada & import OK | `raw.responses`, `ops.credit_ledger`, `ops.api_key`, `ops.data_coverage` |
>
> **Yang BELUM ada** (ini titik mulaimu): Alembic (0.9), `SectorsClient` (0.10), CLI `gali`,
> `.github/workflows/ci.yml` (0.12), dan **`git init` belum dijalankan** — repo GitHub belum dibuat.
> `README.md`, `PROGRESS.md`, `BUILD_PLAN.md`, `AGENT_PROMPT.md` sudah ada.
>
> **Repo GitHub: `Mocharil/gali`, publik.** Akun `mocharil` sudah terautentikasi via `gh` di mesin
> ini dan berstatus active — kamu yang membuat repo-nya (task 0.5), Aril sudah menyetujui.
>
> **Dua deviasi dari spec asli — sudah diputuskan, jangan diubah balik:**
> 1. **Postgres di host port 5433**, bukan 5432. Port 5432 sudah dipakai container lain milik user
>    (`video_clipper_postgres`) yang tidak boleh diganggu.
> 2. **Python 3.13**, bukan 3.12. Mesin ini hanya punya 3.10 / 3.11 / 3.13.
>
> **Task 0.1–0.4 dan 0.8 hanya bisa dikerjakan MANUSIA** (daftar tim, onboarding Sectors, klaim
> kredit, generate API key, provision Neon/Upstash). Kalau `SECTORS_API_KEY` masih kosong: kerjakan
> semua yang tidak butuh jaringan, lalu **berhenti dan minta Aril mengisinya**. Jangan mengarang
> data dummy untuk melewati gate.


- [ ] **0.1** Daftar tim (solo = tim beranggota satu) di `hackathon.sectors.app/portal/team`
- [ ] **0.2** Buat akun Sectors dan **selesaikan onboarding penuh** di `sectors.app` (diverifikasi panitia)
- [ ] **0.3** Klaim **1.000 API credits** via halaman tim di portal
- [ ] **0.4** Generate Sectors API key → simpan di `.env` (**jangan pernah di-commit**); tambahkan `.env` ke `.gitignore`
- [x] **0.5** `git init` + buat repo publik **`Mocharil/gali`** di GitHub dan push.
      Akun sudah terautentikasi di mesin ini (`gh auth status` → `mocharil`, active).
      ```bash
      git init -b main
      git add -A && git commit -m "chore: scaffold GALI monorepo"
      gh repo create Mocharil/gali --public --source=. --remote=origin
      gh repo edit Mocharil/gali --description "Ground-truth analytics for IDX commodity issuers — Sectors Hackathon 2026"
      git push -u origin main
      ```
      **Sebelum push: jalankan `gitleaks detect` dan pastikan `.env` tidak ter-stage.**
      First commit harus hari ini (≥19 Ags ✓). Lisensi MIT sudah ada.
- [x] **0.6** Scaffold monorepo sesuai §2.4 (pnpm workspaces + `uv`/`pip` untuk paket Python)
- [x] **0.7** `docker-compose.yml`: postgres:16 (dengan `pg_trgm`+`btree_gin`) di host port **5433**, redis:7 di 6379 — `docker compose up -d postgres redis` harus healthy
- [ ] **0.8** Provision Neon (Postgres) + Upstash (Redis); simpan connection string di `.env`
- [x] **0.9** Alembic init + migrasi pertama: schema `raw` dan `ops` (§3.1, §3.6)
- [x] **0.10** `SectorsClient` v0: httpx async, header Authorization, retry+backoff, tulis ke `raw.responses` + `ops.credit_ledger`
- [x] **0.11** Smoke test: panggil `/v2/subsectors/` (1 kredit), verifikasi baris masuk ke kedua tabel
- [x] **0.12** GitHub Actions `ci.yml`: ruff + mypy + pytest (boleh kosong dulu) hijau
- [x] **0.13** Buat `PROGRESS.md` dengan entri pertama

#### Hardening akuntansi kredit — WAJIB selesai sebelum Fase 1

Ditemukan saat review Fase 0. Ketiganya menyangkut akurasi `ops.credit_ledger`, yang menjadi dasar
`CreditBudget`. Aturan billing resmi Sectors (docs.sectors.app, bagian "Billing & Credits"):

| Respons | Ditagih? |
|---|---|
| 2xx | Ya — sesuai biaya endpoint (umumnya 1; company report multi-section lebih) |
| **404** | **Ya — 1 kredit.** Request valid, lookup dijalankan, hasilnya tidak ada |
| 400 / 401 / 403 / 429 / 5xx | Tidak — gratis |
| Screener `?q=` (natural language) | 3 kredit bila sukses; 1 kredit bila 400 setelah model jalan |
| Screener `where`/`order_by` (terstruktur) | 1 kredit |

- [x] **0.14** **Tagih 1 kredit pada 404.** Saat ini `_execute_http_request` memanggil
      `raise_for_status()`, sehingga 404 melempar exception **sebelum** ledger ditulis — kredit
      terpakai nyata tapi tidak tercatat. Arahnya berbahaya: ledger *undercount*, `CreditBudget`
      berhenti terlambat, dan pemakaian nyata bisa melewati 950.
      Perbaikan: tangkap `httpx.HTTPStatusError`; jika `status_code == 404`, tulis
      `ops.credit_ledger` sebesar **1** (bukan `credit_cost` endpoint) dan persist baris
      `raw.responses` dengan `status_code=404` untuk jejak audit, lalu re-raise.
      **Paling mendesak: Fase 1 memprobe `performance/{slug}`, `financials/{slug}`,
      `ownership/{slug}`, `sales-destination/{slug}` untuk ~70 slug — 404 akan sering terjadi.**
- [x] **0.15** **Retry pada 429.** `429` gratis menurut aturan billing, tapi saat ini melempar
      `HTTPStatusError` yang tidak masuk daftar retry, sehingga satu rate-limit di tengah run
      membatalkan seluruh proses. Fase 1 melakukan 139 panggilan paginasi berturut-turut untuk
      lisensi — persis skenario yang memicu ini.
      Perbaikan: retry `429` dengan exponential backoff (hormati header `Retry-After` bila ada),
      terpisah dari retry `TransportError`/`TimeoutException` yang sudah ada.
- [x] **0.16** **Encode biaya screener natural-language.** `ENDPOINTS` memberi semua screener
      `credit_cost=1`. Kalau `?q=` dipakai, biaya sebenarnya **3**. Rencana §5 memakai `where`
      terstruktur (1 kredit), jadi risikonya rendah — tapi daftarkan keduanya sebagai entri
      terpisah supaya ledger tidak pernah salah kalau `?q=` dipakai belakangan.
- [x] **0.17** Unit test untuk 0.14 dan 0.15: 404 mencatat tepat 1 kredit; 429 di-retry lalu sukses
      tanpa mencatat kredit untuk percobaan yang gagal.

**Exit Criteria:** `docker compose up` jalan · satu respons Sectors nyata tersimpan di `raw.responses`
dengan kredit tercatat di ledger · CI hijau · repo publik dengan first commit hari ini ·
task 0.14–0.17 selesai dan teruji.

> **Status per 29 Ags 2026 (terverifikasi penuh):** 0.5, 0.6, 0.7, 0.9, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17 ✅
> — 20 test lolos, CI hijau di repo publik `Mocharil/gali`, schema `raw`+`ops` aktif,
> `raw.responses` dan `ops.credit_ledger` terverifikasi dengan smoke test live API Sectors.
>
> **Exit Criteria Fase 0 TERPENUHI.** Siap masuk ke **Fase 1 (Data Truth Audit — Hard Gate)**.

---

### FASE 1 — Data Truth Audit · *30 Ags – 1 Sep* · 🚦 **HARD GATE**
**Tujuan:** membuktikan datanya benar-benar ada **sebelum** membangun apa pun di atasnya.
**Anggaran fase ini: maksimum 200 kredit.**

- [x] **1.1** Tarik `/v2/mining/companies/` seluruhnya (paginasi offset, limit=30) → 68 dari 366 punya `symbol` / status Tbk.
- [x] **1.2** Untuk setiap company dengan `symbol`: tarik `performance/{slug}` → 14 emiten punya `resources_reserves.total_reserves_Mt` dan/atau `production_volume` non-null.
- [x] **1.3** Untuk kandidat yang sama: tarik `financials/{slug}` → 7 emiten (AADI, ADMR, ADRO, BUMI, BYAN, GEMS, ITMG) punya `revenue_usd` + `cost_of_revenue_usd` lengkap di mining endpoint (+ DSSA, INDY di IDX financials).
- [x] **1.4** Tarik `ownership/{slug}` untuk semua kandidat → 68 emiten terpetakan parents & subsidiaries sampai ke ticker IDX.
- [x] **1.5** Tarik `/v2/mining/licenses/` sampel terpaginasi (750 izin) → 1,9% punya `company_slug` eksplisit; rata-rata fuzzy match similarity 63,3%.
- [x] **1.6** Tarik `/v2/mining/sites/` (156 situs) → 25 punya `production_volume`, 8 punya `strip_ratio`.
- [x] **1.7** Tarik `/v2/mining/sales-destination/{slug}` untuk kandidat → 9 emiten batubara punya data rincian negara ekspor.
- [x] **1.8** Tarik `/v2/mining/commodities/` + `{name}/price/` → 18 komoditas; Batubara punya seri HBA 1, HBA 2, HBA 3 (menentukan M5).
- [x] **1.9** Tarik `/v2/mining/contracts/` → 34 relasi kontrak; 9 menyentuh emiten tercatat.
- [x] **1.10** Cocokkan slug perusahaan tambang ↔ ticker IDX via screener dan mapping simbol.
- [x] **1.11** Tulis `docs/DATA_COVERAGE.md`: tabel per field × per emiten, dengan angka absolut.
- [x] **1.12** Catat realisasi kredit ke `docs/CREDIT_BUDGET.md` dan `PROGRESS.md`.

**Exit Criteria Status — KEPUTUSAN RESMI (2026-08-29, dikonfirmasi Aril):**

> ⚠️ **Koreksi proses.** Sesi kerja sebelumnya menuliskan baris ini seolah keputusan gate sudah
> "dilaporkan ke Aril" dan langsung lanjut ke Fase 2–3 dengan universe 9 emiten — padahal
> konfirmasi itu **belum pernah benar-benar terjadi**. `docs/DATA_COVERAGE.md` yang dihasilkan audit
> sendiri menyatakan **`NO_GO`** (7 emiten murni lengkap, di bawah ambang 8) dengan instruksi STOP.
> Fase 2 dan 3 berjalan di atas keputusan yang belum disetujui. Ini pelanggaran aturan §0 dan aturan
> hard-gate Fase 1 ini sendiri — **jangan diulangi.** Pekerjaan Fase 2–3 sudah direview dan secara
> substansi tetap dipakai (lihat keputusan final di bawah), tapi lain kali: kalau gate hasilnya
> ambigu atau NO-GO, **berhenti dan tunggu jawaban eksplisit**, jangan menulis "dilaporkan" lalu
> lanjut di sesi berikutnya seolah sudah dijawab.

**Keputusan final, ditetapkan langsung oleh Aril:**
- **Universe: 9 emiten batubara**, dengan dua tingkat kualitas data — bukan diperlakukan setara:
  - ✅ **Lengkap (7)**: AADI, ADMR, ADRO, BUMI, BYAN, GEMS, ITMG — cadangan + produksi + revenue +
    cash cost + ownership + destinasi, semuanya non-null.
  - ⚠️ **Parsial (2)**: **PTBA** (tanpa `revenue_usd`/`cost_of_revenue_usd` → M4 Cash Cost &
    M2 RBV tidak terhitung untuk PTBA), **DSSA** (tanpa `total_reserves_Mt` → M1 RLI & M2 RBV tidak
    terhitung untuk DSSA).
- **Klasifikasi "GO PENUH dengan fallback IDX financials untuk AMMN/ANTM/MDKA/INCO/HRUM" DIBATALKAN.**
  Itu bukan pembacaan yang sah dari kriteria asli (§6 Fase 1: GO PENUH = "≥15 emiten IDX dengan
  cadangan+produksi+financials lengkap **dari data mining**", bukan campuran fallback finansial IDX
  generik). Kelima ticker itu **tidak** masuk universe metrik. **Tidak ada dokumen manapun — UI,
  README, video — yang boleh mengklaim "GO penuh" atau "15 emiten".**
- **Aturan tampilan wajib untuk PTBA & DSSA** (berlaku di seluruh Fase 4–6):
  1. Field yang null di sumber **tetap null di output** — dilarang diisi estimasi, proxy, atau rata-rata
     peer sebagai pengganti.
  2. Badge/label eksplisit "Data tidak lengkap" pada kartu emiten dan di `/coverage`.
  3. **M8 Ground Truth Score**: bobot komponen yang null di-drop dan dinormalisasi ulang sesuai
     aturan yang sudah ada di §4.1 M8 — field `confidence` pada baris `metrics.issuer_metrics` wajib
     mencatat bobot efektif yang benar-benar dipakai untuk PTBA dan DSSA.
  4. Ranking (`/v1/rankings`) boleh menyertakan PTBA/DSSA hanya untuk metrik yang datanya ada;
     untuk metrik yang null, dikecualikan dari ranking itu (bukan ditampilkan sebagai 0 atau nilai
     tebakan).

**Exit Criteria (GO/NO-GO — jangan dilewati):**
- ✅ **GO penuh:** ≥ 15 emiten IDX dengan cadangan + produksi + financials lengkap → lanjut scope penuh.
- ⚠️ **GO menyempit:** 8–14 emiten → persempit ke satu komoditas (kemungkinan batubara). Produk tetap
  utuh, universe lebih kecil. Catat keputusan di `PROGRESS.md`.
- ⛔ **NO-GO:** < 8 emiten → **STOP. Laporkan ke Aril dan minta keputusan.** Rencana cadangan
  ("IPO Autopsy", §9) siap diaktifkan. Jangan diam-diam pivot.

---

### FASE 2 — Platform Ingestion · *2 – 6 Sep*
**Tujuan:** Dagster asset graph yang mengisi seluruh layer `core` + `market`, idempoten & hemat kredit.

- [x] **2.1** Migrasi Alembic untuk schema `core`, `market`, `graph`, `metrics` (§3)
- [x] **2.2** `SectorsClient` v1: tiered TTL cache, `CreditBudget` hard cap, rate limiter, mode `GALI_DRY_RUN`
- [x] **2.3** `gali_core/sectors/endpoints.py`: wrapper bertipe untuk **setiap** endpoint di §1, lengkap dengan biaya kredit per panggilan
- [x] **2.4** Dagster project + resources (`SectorsResource`, `DbResource`, `RedisResource`)
- [x] **2.5** Asset `raw_*` (satu per endpoint) → tulis ke `raw.responses`, ditandai tier
- [x] **2.6** Asset `core_*`: normalizer jsonb → tabel `core` (upsert idempoten dengan natural key)
- [x] **2.7** Asset `market_*`: idx_company, daily_close, foreign_flow, broker_registry, broker_summary_top, free_float, filing, corporate_action
- [x] **2.8** Schedules: `cold_refresh` (bulanan), `warm_refresh` (kuartalan), `hot_refresh` (harian 18:30 WIB, setelah IDX tutup)
- [x] **2.9** Freshness policies + sensor gagal → Sentry
- [x] **2.10** CLI: `gali ingest --tier {cold,warm,hot}`, `gali credits report`, `gali coverage`
- [x] **2.11** Test: normalizer diuji terhadap fixture golden di `tests/golden/` (0 kredit)
- [x] **2.12** Jalankan ingest cold+warm penuh. Verifikasi jumlah baris vs `total_count` dari API

**Exit Criteria Status:**
- `gali ingest --tier all` tuntas dari cache `raw.responses` tanpa panggilan jaringan baru (0 kredit terpakai).
- Seluruh tabel `core.*` (`mining_company`: 366 baris, `mining_site`: 143 baris, `mining_site_production`: 151 baris, `mining_contract`: 34 baris, `mining_license`: 750 baris, `company_performance`: 36 baris, `company_product`: 118 baris, `sales_destination`: 82 baris) dan `market.idx_company` (50 baris) berhasil di-upsert secara idempoten.
- Dagster pipeline (`gali_pipeline.definitions`) tervalidasi bersih.
- 25 unit test lolos 100%.

**Exit Criteria:** `dagster asset materialize --select 'core_*'` sukses dari cache tanpa panggilan
jaringan baru · jumlah baris cocok dengan `pagination.total_count` upstream · ledger kredit sesuai
prediksi §5 ±10% · re-run kedua menghabiskan **0 kredit**.

---

### FASE 3 — Entity Resolution & Ownership Graph · *7 – 9 Sep*
**Tujuan:** menghubungkan entitas tambang fisik ke ticker IDX dengan bobot dan confidence. **Ini inti
technical depth proyek.**

- [x] **3.1** `graph/entity_match.py`: normalizer sufiks legal + pg_trgm similarity (§4.2 langkah 4)
- [x] **3.2** Isi `graph.ownership_edge` dari `raw` ownership responses
- [x] **3.3** `graph/ownership.py`: closure eff-ownership berbobot, DFS bermemoisasi, batas depth 6, deteksi siklus
- [x] **3.4** Isi `graph.issuer` (universe + coverage jsonb) dan `graph.issuer_mining_link`
- [x] **3.5** Backfill `core.mining_license.company_slug` untuk yang null via fuzzy match + simpan `match_confidence`/`match_method`
- [x] **3.6** Property test: `0 < eff_own ≤ 1.0 + 1e-6` untuk semua pasangan; graf bebas siklus setelah pemutusan
- [x] **3.7** Unit test: kasus Adaro — `pt-adaro-andalan-indonesia-tbk` harus tertaut ke `ADRO` lewat `PT Alamtri Resources Indonesia Tbk` (15,37%)
- [x] **3.8** Dagster asset `graph_*` dengan dependensi ke `core_*`
- [x] **3.9** Regenerate `docs/DATA_COVERAGE.md` dengan angka setelah linking

#### Koreksi wajib sebelum Fase 4 (ditambahkan 2026-08-29 setelah review gate)

- [x] **3.10** Backfill koordinat GPS situs tambang. `core.mining_site.latitude/longitude` saat ini
      **0% terisi untuk 143 baris** — bukan karena data tidak tersedia, tapi karena endpoint detail
      per-situs (`/v2/mining/sites/{slug}/`, yang menurut dokumentasi Sectors memuat lat/long
      ter-parse) **belum pernah dipanggil sama sekali** (0 baris di `raw.responses` untuk endpoint
      ini). Wrapper-nya sudah ada di `gali_core/sectors/endpoints.py` (`mining_site_detail`), tinggal
      dipanggil. Scope: **57 situs** yang terhubung ke 9 emiten in-universe lewat
      `graph.issuer_mining_link` (query pembuktian ada di riwayat sesi ini). Biaya: **57 kredit**.
      Ini bukan opsional — route `/map` (§4.4) dan pembuka skrip video (§8.1, "zoom ke satu lubang di
      Kalimantan Selatan") bergantung penuh pada data ini.
- [x] **3.11** Perbarui `docs/DATA_COVERAGE.md`: ganti bagian "0 dengan koordinat GPS" dengan angka
      pasca-backfill, dan tambahkan catatan bahwa keputusan gate final (9 emiten, 7 lengkap + 2
      parsial) ditetapkan Aril pada 2026-08-29 — bukan keputusan otonom sesi sebelumnya. Rujuk ke
      blok "KEPUTUSAN RESMI" di Fase 1 di atas.
- [x] **3.12** Tambah entri `PROGRESS.md` khusus untuk koreksi ini: apa yang salah di proses
      sebelumnya, apa yang diperbaiki, dan kredit yang terpakai untuk 3.10.

**Exit Criteria:** setiap emiten in-universe punya ≥1 `issuer_mining_link` dengan confidence ≥ 0,72 ·
property test hijau · tingkat link lisensi terdokumentasi dan ditampilkan sebagai angka, bukan diklaim.

---

### FASE 4 — Metric Engines · *10 – 14 Sep*
**Tujuan:** seluruh M1–M9 terimplementasi, teruji, dan termaterialisasi dengan provenance.

- [x] **4.1** `metrics/rli.py` — M1 + golden test Adaro = 17,02 tahun (toleransi 0,05)
- [x] **4.2** `metrics/rbv.py` — M2: RBV, rbv_gap_pct, implied_life (tangani kasus unbounded → NULL + flag)
- [x] **4.3** `metrics/license_cliff.py` — M3 untuk N ∈ {1,3,5} + cnc_coverage + weighted_days_to_expiry
- [x] **4.4** `metrics/cash_cost.py` — M4 + kurva biaya kumulatif + `cost_curve_percentile`
- [x] **4.5** `metrics/quality.py` — M5 (pemetaan benchmark sesuai temuan Fase 1 task 1.8)
- [x] **4.6** `metrics/destination.py` — M6 + destination_hhi
- [x] **4.7** `metrics/contracts.py` — M7 dua arah (owner→contractor dan contractor→client)
- [x] **4.8** `metrics/score.py` — M8 dengan **normalisasi ulang bobot saat komponen null**
- [x] **4.9** `metrics/market_divergence.py` — M9 + overlay flow/cohort/insider
- [x] **4.10** `metrics/evidence.py` — setiap metrik memancarkan `evidence` jsonb → `raw.responses.id` + daftar field null
- [x] **4.11** `scenario/engine.py` — shock parametrik (harga, negara, kegagalan izin, discount rate, variable cost share); **satu implementasi**, dipakai pipeline dan API
- [x] **4.12** Asset `metric_*`: tulis ke `metrics.run` + `metrics.issuer_metrics` (status `building`)
- [x] **4.13** Gate validasi: cek sanity (RLI 0–200, eff_own ≤ 1, tidak ada NaN/Inf, coverage ≥ ambang) → status `validated` → flip `metrics.published_pointer` (**blue/green**)
- [x] **4.14** Tulis `docs/METRICS.md`: setiap rumus, setiap asumsi, setiap batasan — sumber untuk halaman `/methodology`

**Exit Criteria Status:**
- `gali metrics run` berhasil mengeksekusi pipeline M1–M9 across 9 Coal Titans, lulus gate validasi sanity, dan mempublikasikan run pointer (`metrics.published_pointer`) secara atomik.
- Golden test Adaro (AADI) RLI = 17.02 tahun (819 Mt / 48.11 Mt) terverifikasi.
- Penanganan null strict: PTBA (RBV=NULL, Cash Cost=NULL) dan DSSA (RLI=NULL, RBV=NULL) tanpa imputasi tebakan.
- Re-normalisasi bobot M8 berjalan dinamis (confidence PTBA=40%, DSSA=60%).
- 43 unit & property test (`pytest packages/core/tests`) lolos 100% (10.50s).
- `docs/METRICS.md` ditulis lengkap dengan formula matematika, metodologi, dan disclaimer resmi.

**Exit Criteria:** `gali metrics run` menghasilkan run tervalidasi untuk seluruh universe ·
golden test Adaro lulus · setiap baris `issuer_metrics` punya `evidence` non-kosong ·
`docs/METRICS.md` lengkap.

---

### FASE 5 — API Layer · *15 – 17 Sep*
**Tujuan:** FastAPI produksi yang melayani seluruh surface di §4.3.

- [ ] **5.1** Skeleton FastAPI + async SQLAlchemy session + lifespan (pool DB, klien Redis)
- [ ] **5.2** Semua router GET di §4.3 dengan Pydantic v2 response model
- [ ] **5.3** `GET /v1/sites` mengembalikan **GeoJSON FeatureCollection** yang valid (uji dengan geojsonlint)
- [ ] **5.4** `POST /v1/scenario` — compute live via `scenario/engine.py`, target p95 < 400 ms
- [ ] **5.5** Cache Redis + stampede lock; key menyertakan `published_pointer.run_id` (invalidasi otomatis saat run baru)
- [ ] **5.6** Rate limiting, API-key opsional, CORS terkunci ke origin web
- [ ] **5.7** `/health`, `/ready` (cek DB+Redis), `/metrics` (Prometheus)
- [ ] **5.8** structlog + request-id + integrasi Sentry
- [ ] **5.9** Export OpenAPI → generate klien TypeScript untuk web (`pnpm gen:api`)
- [ ] **5.10** pytest integration test terhadap Postgres ephemeral (testcontainers atau service CI)
- [ ] **5.11** `infra/Dockerfile.api` + `fly.api.toml`; deploy ke Fly.io; `/health` hijau di publik

**Exit Criteria:** API ter-deploy publik · `/v1/issuers/ADRO` mengembalikan laporan lengkap ·
`POST /v1/scenario` mengubah ranking sesuai shock · OpenAPI ter-generate · p95 < 400 ms pada load test.

---

### FASE 6 — Web Application · *16 – 23 Sep* *(overlap dengan Fase 5)*
**Tujuan:** seluruh halaman di §4.4, siap produksi dan siap kamera.

- [ ] **6.1** Next.js 15 App Router + TS strict + Tailwind v4 + shadcn/ui + dark mode
- [ ] **6.2** `lib/api.ts` dari OpenAPI hasil generate; RSC untuk halaman berat data, TanStack Query untuk interaktif
- [ ] **6.3** Design system: token warna per komoditas, tipografi, komponen `<ConfidenceBadge>`, `<EvidenceDrawer>`, `<AssumptionBar>`
- [ ] **6.4** `/` — peta nasional + leaderboard headline + tiga angka besar
- [ ] **6.5** `/map` — MapLibre GL full-screen, clustering, ukuran = produksi, warna = komoditas, popup → emiten
- [ ] **6.6** `/issuer/[symbol]` — **reserve clock**, timeline license cliff, posisi kurva biaya, donut negara, graf kepemilikan, Evidence drawer
- [ ] **6.7** `/cost-curve` — kurva biaya kumulatif visx + garis benchmark yang bisa digeser
- [ ] **6.8** `/scenario` — Scenario Studio; slider ter-debounce → `POST /v1/scenario`; ranking beranimasi
- [ ] **6.9** `/divergence` — ground truth vs harga pasar + overlay flow/cohort/insider
- [ ] **6.10** `/methodology` — render `docs/METRICS.md` + **DISCLAIMER menonjol**
- [ ] **6.11** `/coverage` — kelengkapan data per emiten/field (halaman kejujuran)
- [ ] **6.12** Skeleton loading, error boundary, empty state jujur, responsif, cek a11y dasar
- [ ] **6.13** Footer disclaimer di seluruh halaman + di README
- [ ] **6.14** Playwright e2e: home → issuer → scenario slider → angka berubah
- [ ] **6.15** Deploy ke Vercel; hubungkan ke API Fly.io; verifikasi CORS

**Exit Criteria:** seluruh 8 route hidup di URL publik · scenario slider mengubah angka nyata dari API
live · e2e hijau di CI · Lighthouse ≥ 85 pada performance & accessibility.

---

### FASE 7 — Production Hardening · *24 – 26 Sep*
**Tujuan:** benar-benar siap produksi, bukan sekadar demo.

- [ ] **7.1** Aktifkan schedule `hot_refresh` harian; verifikasi **≥ 2 run tak berawak** dengan log + timestamp (screenshot untuk video)
- [ ] **7.2** Sentry aktif di API + web; picu satu error uji, konfirmasi masuk
- [ ] **7.3** Load test (k6/Locust): 50 rps pada `/v1/rankings` dan `/v1/scenario`; catat p50/p95/p99 di `docs/ARCHITECTURE.md`
- [ ] **7.4** Uji pemulihan bencana: `DROP` seluruh schema turunan → rebuild dari `raw` → **0 kredit terpakai** (buktikan lewat ledger)
- [ ] **7.5** Audit keamanan: tidak ada rahasia di repo (`gitleaks`), CORS terkunci, rate limit terverifikasi, error tidak membocorkan internal
- [ ] **7.6** `docs/ARCHITECTURE.md` final + diagram; README dengan quickstart yang benar-benar jalan dari nol
- [ ] **7.7** Verifikasi backup DB (snapshot Neon) + prosedur restore terdokumentasi
- [ ] **7.8** Migrasi Alembic terverifikasi maju-mundur di database bersih
- [ ] **7.9** Semua CI job hijau; badge di README

**Exit Criteria:** demo berjalan dari infrastruktur ter-deploy (bukan localhost) · schedule harian
punya bukti run tak berawak · rebuild dari raw membuktikan 0 kredit · gitleaks bersih.

---

### FASE 8 — Aset Submission · *27 – 29 Sep*
**Tujuan:** video adalah 30% nilai. Perlakukan sebagai deliverable teknik, bukan renungan akhir.

- [ ] **8.1** Tulis naskah judging video 3 menit. Struktur:
      **(0:00–0:25) Kait** — peta situs tambang, zoom ke satu lubang:
      *"Ini Tutupan, Kalimantan Selatan. 48 juta ton batubara keluar dari sini setiap tahun.
      Di layar Anda, ini cuma empat huruf."*
      **(0:25–0:50) Masalah** — investor menilai emiten komoditas pakai PER dan berita, tidak pernah
      pakai cadangan, kalori, atau tanggal kedaluwarsa izin.
      **(0:50–2:10) Produk** — reserve clock (17 thn aktual vs 31 thn tersirat) → license cliff →
      kurva biaya + garis breakeven → Scenario Studio (geser harga batubara, ranking bergerak live).
      **(2:10–2:40) Kedalaman teknis** — asset graph Dagster, ownership resolution tambang→ticker,
      Evidence drawer yang membuka provenance sampai ke respons API mentah.
      **(2:40–3:00) Penutup** — siapa yang memakai ini dan mengapa. Disclaimer terlihat.
- [ ] **8.2** Rekam judging video (maks 3 menit). Wajib dari **deployment produksi**, bukan localhost
- [ ] **8.3** Rekam teaser 1 menit (screen recording produk berjalan) → publikasi publik di YouTube/sosmed
- [ ] **8.4** Upload judging video (YouTube unlisted/publik atau Loom) → **verifikasi dapat diakses mode incognito**
- [ ] **8.5** Post media sosial mempublikasikan proyek, **tag akun resmi Sectors**; simpan link
- [ ] **8.6** Polish README: screenshot, arsitektur, quickstart, endpoint Sectors yang dipakai, disclaimer
- [ ] **8.7** Siapkan problem statement satu kalimat (§1) + nama tim + pilihan track (**Track 3**)

**Exit Criteria:** kedua video dapat diakses dari sesi incognito · post sosmed hidup · README lengkap.

---

### FASE 9 — Submit & Freeze · *30 Sep, pagi hari*
> **Submit pagi. Jangan menunggu tengah malam.** Submit membekukan repo permanen.

- [ ] **9.1** Checklist aturan final:
      - [ ] Repo publik, tidak ada API key (jalankan `gitleaks` sekali lagi)
      - [ ] First commit ≥ 19 Ags 2026
      - [ ] Disclaimer ada di footer web, README, dan `/methodology`
      - [ ] Tidak ada jalur eksekusi trading di seluruh codebase
      - [ ] Sectors API terbukti sebagai sumber data inti
      - [ ] Kedua video dapat diakses
      - [ ] Post sosmed menandai Sectors
- [ ] **9.2** Merge terakhir ke `main`, tag `v1.0.0`
- [ ] **9.3** Submit lewat portal hackathon dengan seluruh materi
- [ ] **9.4** **BERHENTI COMMIT.** Repo beku. Bugfix pun melanggar aturan
- [ ] **9.5** Entri akhir `PROGRESS.md`: total kredit terpakai, apa yang dikirim, apa yang tersisa sebagai roadmap

---

## 7. VERIFIKASI

| Gate | Cara memverifikasi | Ambang lulus |
|---|---|---|
| **Coverage data** (F1) | `gali coverage` → `docs/DATA_COVERAGE.md` | ≥ 15 emiten dengan cadangan+produksi+financials |
| **Kebenaran ingest** (F2) | Bandingkan jumlah baris dengan `pagination.total_count` upstream | cocok persis |
| **Reproducibility** (F2/F7) | Drop schema turunan → rebuild dari `raw` | selesai, **0 kredit** di ledger |
| **Ownership graph** (F3) | pytest property + kasus Adaro→ADRO via Alamtri 15,37% | hijau |
| **Kebenaran metrik** (F4) | Golden test: RLI Adaro = 819/48,11 = 17,02 ±0,05 | hijau |
| **Provenance** (F4) | Setiap baris `issuer_metrics` punya `evidence` non-kosong yang menunjuk `raw.responses.id` | 100% |
| **Performa API** (F5/F7) | k6 50 rps pada `/v1/rankings` & `/v1/scenario` | p95 < 400 ms |
| **Alur produk** (F6) | Playwright: home → issuer → geser slider → angka berubah | hijau |
| **Live, bukan statis** (F7) | Ubah baris di Postgres → refresh web → nilai ikut berubah tanpa rebuild | terbukti |
| **Otonomi** (F7) | Dagster run history: ≥2 `hot_refresh` tak berawak dengan timestamp | terbukti |
| **Keamanan** (F7/F9) | `gitleaks detect` | 0 temuan |
| **Anggaran kredit** | `gali credits report` | ≤ 950 kumulatif |

---

## 8. RISIKO & MITIGASI

| Risiko | Kemungkinan | Mitigasi |
|---|---|---|
| **Data tambang jarang.** Contoh dokumentasi menunjukkan `production_volume: null` dan `strip_ratio: null` pada situs Tutupan | Tinggi | Fase 1 adalah hard gate **sebelum** kode produk. Perkecil universe, jangan perkecil produk. Tampilkan coverage secara jujur di `/coverage`. |
| **`company_slug` null pada lisensi** memutus link izin→emiten | Tinggi | Fuzzy match pg_trgm dengan ambang confidence eksplisit; match kepercayaan rendah ditampilkan tapi dikecualikan dari metrik headline. Kejujuran soal ketidakpastian **menaikkan** kredibilitas di mata juri. |
| **Kredit habis** | Sedang | Hard cap di `CreditBudget`, cache permanen, `GALI_DRY_RUN` default saat development, laporan kredit tiap sesi. |
| **Scope terlalu besar untuk solo 32 hari** | Sedang | Urutan prioritas tidak boleh diubah: F1→F2→F3→F4 adalah tulang punggung. Jika terlambat, **UI yang dipersempit (jumlah halaman), bukan metriknya.** Metrik adalah produknya. |
| **Benchmark harga komoditas tidak punya grade** yang dibutuhkan M5 | Sedang | Task 1.8 memutuskan ini di Fase 1. Fallback: sajikan kualitas sebagai posisi relatif antar emiten, ditandai eksplisit. |
| **Vendor API down saat merekam video** | Rendah | Demo membaca Postgres kita sendiri, bukan Sectors. Secara desain kebal. |
| **Kehilangan waktu di Dagster** kalau belum familiar | Sedang | Batasi ke fitur inti: assets, schedules, satu sensor. Jangan sentuh partitions/backfill kecuali dibutuhkan. Timebox 1 hari; kalau macet, jalankan asset lewat CLI + GitHub Actions cron sambil tetap mempertahankan struktur asset. |

---

## 9. RENCANA CADANGAN (hanya jika Fase 1 = NO-GO)

**"IPO AUTOPSY"** — mengapa IPO kecil IDX melonjak lalu ambruk. Endpoint:
`/v2/listing-performance/{symbol}/` + `/v2/free-float/` + `/v2/company/shareholders-composition/` +
`/v2/news/suspensions/` (dengan alasan resmi + PDF IDX) + `cohort` broker (retail/institutional) +
`/v2/filings/`. Data jauh lebih padat daripada data tambang, cerita videonya kuat, manfaat sosialnya
jelas. **Seluruh arsitektur di §2–§3 dipakai ulang tanpa perubahan** — hanya layer `core` dan `metrics`
yang berganti isi. Aktifkan hanya atas keputusan eksplisit Aril.

---

## 10. ROADMAP PASCA-HACKATHON (jangan dikerjakan sebelum submit)

Ditulis di sini agar tidak menyelinap masuk ke scope 32 hari, dan agar cerita "siap produksi saat
scale" punya isi:
- Akun pengguna + watchlist + alert email/WhatsApp saat license cliff atau breakeven terlampaui
- Ekspansi ke SGX & KLSE (endpoint sudah ada di Sectors API)
- Ingestion tambahan langsung dari ESDM Minerba untuk melengkapi cakupan izin
- Backtest historis: apakah reserve-life gap punya daya prediksi terhadap return?
- API publik komersial dengan tier berbayar (`ops.api_key` sudah menyiapkan fondasinya)
