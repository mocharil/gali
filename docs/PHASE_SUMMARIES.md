# GALI — Ringkasan Eksekutif Hasil Pengerjaan per Fase (Phase 0 – Phase 9)

Dokumen ini merupakan laporan komprehensif yang merangkum seluruh hasil implementasi, arsitektur teknis, audit data, dan verifikasi independen proyek **GALI (Ground-truth Analytics for Listed Issuers)** untuk **Sectors Hackathon 2026 (Track 3: Market Intelligence)**.

---

## 📌 Ringkasan Status Proyek

- **Live Web Application**: [https://gali-web.vercel.app](https://gali-web.vercel.app)
- **Live REST API & Swagger**: [https://gali-api.vercel.app/docs](https://gali-api.vercel.app/docs)
- **GitHub Repository**: [https://github.com/mocharil/gali](https://github.com/mocharil/gali)
- **Status CI/CD**: [![CI](https://github.com/mocharil/gali/actions/workflows/ci.yml/badge.svg)](https://github.com/mocharil/gali/actions/workflows/ci.yml) [![Hot Refresh](https://github.com/mocharil/gali/actions/workflows/refresh.yml/badge.svg)](https://github.com/mocharil/gali/actions/workflows/refresh.yml)
- **Realisasi Anggaran Kredit**: **405 / 1.000 Kredit** (Disiplin ketat, aman di bawah batas maksimal 950 kredit).
- **Audit Keamanan**: `gitleaks detect -v` **0 Temuan Rahasia (Clean)**.

---

## 🏗️ Detail Pengerjaan per Fase

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5 ──► Fase 6 ──► Fase 7 ──► Fase 8 ──► Fase 9
Fondasi    Audit Data  Pipeline   Graf Relasi Metrik M1-M9 REST API    Web UI    Hardening  Aset Demo  Freeze
```

---

### 🔹 FASE 0 — Fondasi & Arsitektur Monorepo
*Tujuan: Membangun fondasi infrastruktur monorepo, environment database lokal, dan guard rel ganda proteksi anggaran kredit.*

- **Pencapaian Utama**:
  1. **Struktur Monorepo Modern**: Memisahkan kode ke dalam 4 paket terisolasi: `packages/core` (engine inti & DB), `packages/api` (FastAPI service), `packages/pipeline` (Dagster assets), dan `packages/web` (Next.js 15).
  2. **Database Ganda**: Konfigurasi Docker Compose untuk PostgreSQL 16 (port 5433) dan Redis 7 (port 6379).
  3. **Dual Engine SQLAlchemy**: Konfigurasi `asyncpg` untuk async API endpoint dan `psycopg` untuk migrasi Alembic serta pipeline data.
  4. **Proteksi Anggaran Kredit (`CreditBudget`)**: Membangun client wrapper Sectors API dengan proteksi hard cap (950 kredit), auto-caching di skema `raw.responses`, dan mode `GALI_DRY_RUN` default agar development offline tidak membuang kredit.
- **Verifikasi**: `pytest packages/core/tests/test_budget.py` lolos 100%, pembacaan `.env` aman tanpa membocorkan secrets.

---

### 🔹 FASE 1 — Data Truth Audit & Universe Gate Decision
*Tujuan: Audit kualitas data upstream Sectors API secara empiris sebelum menulis kode bisnis.*

- **Pencapaian Utama**:
  1. **Audit Empiris 404 Kredit**: Memanggil endpoint mining, companies, sites, licenses, dan financials untuk memetakan kelengkapan data tambang Indonesia.
  2. **Keputusan Gate Resmi (*Coal Titans Universe*)**:
     - 7 Emiten Lengkap: `AADI`, `ADMR`, `ADRO`, `BUMI`, `BYAN`, `GEMS`, `ITMG`.
     - 2 Emiten Parsial: `DSSA`, `PTBA` (ditandai dengan badge transparansi data parsial).
  3. **Dokumentasi Audit**: Menerbitkan [`docs/DATA_COVERAGE.md`](file:///docs/DATA_COVERAGE.md) dan [`docs/CREDIT_BUDGET.md`](file:///docs/CREDIT_BUDGET.md).
- **Verifikasi**: Laporan audit data membuktikan 52 situs tambang memiliki koordinat GPS valid dan data produksi tahunan yang konsisten.

---

### 🔹 FASE 2 — Pipeline Ingestion & Normalisasi Multi-Tier
*Tujuan: Membangun pipeline ingestion Software-Defined Assets (SDA) dan normalizer multi-tier.*

- **Pencapaian Utama**:
  1. **Software-Defined Assets (Dagster)**: Mendefinisikan asset graph dari `raw.*` -> `core.*` -> `market.*`.
  2. **Normalisasi Idempoten**: Menulis normalizer terstruktur untuk tabel:
     - `core.mining_company` (366 entitas)
     - `core.mining_site` & `core.mining_site_production` (310 baris)
     - `core.mining_license` (750 izin ESDM)
     - `core.mining_contract` (34 kontrak kontraktor)
     - `core.sales_destination` (82 rute ekspor negara)
     - `core.commodity_price` (672 data titik harga batubara & HBA)
     - `market.idx_company` (59 emiten terdaftar)
  3. **Kemampuan Replay 0-Kredit**: Seluruh layer `core` dan `market` dapat di-ingest ulang dari cache `raw.responses` tanpa satu pun panggilan API keluar.
- **Verifikasi**: `pytest packages/core/tests/test_normalizers.py` lolos 100%.

---

### 🔹 FASE 3 — Ownership Graph & Entity Resolution
*Tujuan: Menjembatani kode saham publik (IDX) ke entitas operasional pemegang konsesi tambang fisik (ESDM).*

- **Pencapaian Utama**:
  1. **Graf Kepemilikan Efektif**: Algoritma rekursif multi-hop dengan penanganan siklus (*cycle prevention*) dan pembatasan kedalaman (*depth bound*).
  2. **Resolusi Kasus Khusus Korporasi**:
     - Relasi spin-off `ADRO` -> `AADI` (15.37% kepemilikan efektif pasca-restrukturisasi).
     - Rantai kepemilikan `BUMI` melalui PT Kaltim Prima Coal (KPC) dan PT Arutmin Indonesia.
     - Struktur holding `BYAN` melalui PT Perkasa Inakakerta dan PT Wahana Baratama Mining.
  3. **Entity Matcher Fuzzy Trigram**: Mengaitkan nama pemegang izin ESDM ke slug perusahaan tambang dengan skor kemiripan teks `pg_trgm` dan ambang batas confidence yang transparan.
- **Verifikasi**: `gali graph resolve` berhasil memetakan 183 edge kepemilikan, 407 tautan emiten-tambang, dan menginisialisasi 83 profil emiten.

---

### 🔹 FASE 4 — Ground Truth Metrics (Engine M1–M9)
*Tujuan: Menghitung 9 metrik fundamental tambang fisik dan nilai Ground Truth Score.*

- **Pencapaian Utama**:
  1. **M1: Reserve Life Index (RLI)**: Umur cadangan aktual (tahun) = Cadangan Terbukti / Laju Produksi Tahunan.
  2. **M2: Reserve-Backed Value (RBV)**: Valuasi wajar cadangan berbasis Discounted Cash Flow (DCF) laba kotor proporsional kepemilikan (10% discount rate).
  3. **M3: License Cliff**: Persentase produksi yang izin ESDM-nya akan kedaluwarsa dalam 1, 3, dan 5 tahun ke depan.
  4. **M4: Cumulative Cash Cost Curve**: Kurva tangga biaya tunai nasional dan titik impas harga acuan (*breakeven price*).
  5. **M5: Quality Adjustment**: Penyesuaian kalori batubara (GAR) terhadap indeks pasar (ICI-1 s.d. ICI-4).
  6. **M6: Destination Stress Test**: Konsentrasi pasar ekspor via Herfindahl-Hirschman Index (HHI) dan simulasi tarif impor.
  7. **M7: Contractor Risk**: Ketergantungan operasional terhadap kontraktor penambangan utama.
  8. **M8: Ground Truth Score (0–100)**: Skor komposit tertimbang yang mencerminkan kesehatan fundamental tambang fisik.
  9. **M9: Market Divergence**: Perbandingan deviasi antara Reserve-Backed Value (M2) dengan Market Cap aktual pasar modal.
  10. **Evidence Provenance Drawer**: Setiap baris metrik mengikat ID respons mentah di `raw.responses`, memungkinkan verifikasi audit hingga ke sumber data asli.
  11. **Arsitektur Blue/Green Pointer**: Komputasi metrik berjalan terisolasi per `run_id`, lalu dipublikasikan secara atomik via `metrics.published_pointer`.
- **Verifikasi**: Golden tests membuktikan RLI Adaro = 17.02 tahun (819 Mt / 48.11 Mt) dan validasi matematis M1–M9 lulus 100%.

---

### 🔹 FASE 5 — REST API Service (FastAPI)
*Tujuan: Membangun backend service produksi berkecepatan tinggi dengan proteksi keamanan penuh.*

- **Pencapaian Utama**:
  1. **REST Endpoints Terstruktur**:
     - `GET /v1/rankings`: Leaderboard multi-metrik dengan sorting dinamis.
     - `GET /v1/issuers/{symbol}`: Profil lengkap emiten, metrik M1–M9, dan data provenance.
     - `POST /v1/scenario`: Live compute simulasi shock harga komoditas dan tarif impor.
     - `GET /v1/cost-curve`: Data kurva biaya kumulatif nasional.
     - `GET /v1/sites`: GeoJSON/koordinat situs tambang ber-GPS.
     - `GET /v1/coverage`: Audit kelengkapan data dan ledger kredit.
     - `GET /ready` & `GET /health`: Healthcheck & readiness probe.
  2. **Bugfix Task 5.12 (Zero-Shock Invariant)**: Menyelaraskan basis laba kotor pada baseline dan post-shock (`attributable_gross_profit_usd`), membuktikan secara matematis bahwa payload kosong `{}` menghasilkan delta persis `0.0%` di semua emiten.
  3. **Keamanan & Rate Limiting**:
     - CORS Origin Lockdown ketat (`CORS_ALLOW_ORIGINS`).
     - Sliding-Window Rate Limiter berbasis Redis (60 RPM anonim, 600 RPM dengan API key).
  4. **Deploy Produksi**: Live di [https://gali-api.vercel.app](https://gali-api.vercel.app).
- **Verifikasi**: 23 unit & integration tests lulus, OpenAPI spec tervalidasi via `pnpm gen:api`.

---

### 🔹 FASE 6 — Frontend Application (Next.js 15)
*Tujuan: Dashboard web interaktif yang modern, responsif, dan kaya data visual.*

- **Pencapaian Utama**:
  1. **8 Halaman Interaktif Lengkap**:
     - **Home (`/`)**: National mining map compact, 3 KPI stats utama, dan Leaderboard Ground Truth Score.
     - **Interactive Concession Map (`/map`)**: Full-screen MapLibre GL dengan 52 titik GPS situs tambang nyata, layer heatmap kalori, dan filter emiten.
     - **Issuer Detail (`/issuer/[symbol]`)**: Visualisasi Reserve Life Clock, Timeline License Cliff, Cost Curve breakdown, dan Evidence Drawer interaktif.
     - **Scenario Studio (`/scenario`)**: Slider live-compute shock harga batubara global, tarif negara tujuan, dan toggle perpanjangan izin.
     - **National Cost Curve (`/cost-curve`)**: Kurva tangga kumulatif biaya tunai industri batubara Indonesia vs benchmark harga ICI.
     - **Market Divergence Matrix (`/divergence`)**: Kuadran valuasi pasar vs valuasi cadangan fisik (Undervalued vs Overvalued).
     - **Methodology & Formulas (`/methodology`)**: Dokumentasi transparan seluruh rumus matematis M1–M9 langsung dari `docs/METRICS.md`.
     - **Data Coverage & Truth Audit (`/coverage`)**: Pelacakan transparan kelengkapan data per layer dan audit pengeluaran kredit Sectors API.
  2. **Komponen Reusable**: `<ConfidenceBadge>`, `<EvidenceDrawer>`, `<AssumptionBar>`, `<MetricCard>`.
  3. **Playwright E2E Testing**: 4/4 skenario pengujian browser otomatis (Home render, Issuer detail navigation, Scenario Studio zero-shock invariant assert, Coverage audit) lulus 100% hijau.
  4. **Deploy Produksi**: Live di [https://gali-web.vercel.app](https://gali-web.vercel.app).
- **Verifikasi**: Playwright E2E pass, Lighthouse score performa dan aksesibilitas tinggi.

---

### 🔹 FASE 7 — Production Hardening & Disaster Recovery
*Tujuan: Memastikan keandalan produksi, otomatisasi ingest harian, dan ketahanan bencana.*

- **Pencapaian Utama**:
  1. **Jadwal Ingest Harian Tak Berawak (Task 7.1)**: GitHub Actions workflow `.github/workflows/refresh.yml` otomatis materialisasi raw assets, normalisasi layer data, dan kalkulasi Ground Truth metrik setiap hari kerja bursa.
  2. **Loop-Aware Serverless Redis Pool**: Menghilangkan error event-loop pada serverless function Vercel via `weakref.WeakKeyDictionary`, mengaktifkan cache Upstash Redis secara konsisten.
  3. **Optimasi Latensi (Task 7.3)**:
     - Server process time `GET /v1/rankings` p50 turun drastis dari 1.150 ms ke **87.1 ms**.
     - Caching published pointer (`gali:v1:published_run_id`, 300s TTL) memangkas query berulang ke Postgres.
  4. **Audit Keamanan & Rate Limiting Live (Task 7.5)**:
     - `gitleaks detect -v` bersih dari kebocoran rahasia (0 temuan).
     - Uji burst 160 request/2.1 detik membuktikan **142 request diblokir dengan HTTP 429 Too Many Requests** dan header `Retry-After: 16`.
  5. **Uji Pemulihan Bencana / Disaster Recovery (Task 7.4)**:
     - Menjalankan `DROP SCHEMA core, market, graph, metrics CASCADE;` di Neon PostgreSQL produksi.
     - Rebuild 100% dari cache `raw.responses` membuktikan **0 kredit baru terpakai** (total kredit tetap persis 405/1000). Seluruh endpoint API dan web pulih normal.
  6. **Arsitektur Lengkap**: Menerbitkan dokumen teknis [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md).
- **Verifikasi**: Seluruh 68 file lulus linting `ruff` dan typecheck `mypy` tanpa error.

---

### 🔹 FASE 8 — Aset Submission & Materi Presentasi
*Tujuan: Menyiapkan naskah video judging 3 menit, teaser media sosial, dan materi submisi resmi.*

- **Pencapaian Utama**:
  1. **Naskah Judging Video 3 Menit**: Struktur 5 segmen (Kait emosional tambang Tutupan -> Problem statement -> Deep dive produk & Evidence Drawer -> Live Scenario Studio -> Arsitektur & Penutup) terdokumentasi di [`docs/JUDGING_SCRIPT.md`](file:///docs/JUDGING_SCRIPT.md).
  2. **Naskah Teaser 60 Detik**: Script rekaman ringkas untuk media sosial.
  3. **Draf Publikasi**: Template posting LinkedIn dan Twitter/X resmi dengan tagging akun Sectors.
  4. **Metadata Submisi**: Formulir deskripsi proyek satu kalimat, live URL, dan track lomba (Track 3).
- **Verifikasi**: Seluruh materi submission selaras dengan panduan hackathon dan siap rekam.

---

### 🔹 FASE 9 — Submisi Final & Repository Freeze
*Tujuan: Memastikan seluruh aturan kepatuhan hackathon terpenuhi dan membekukan repositori.*

- **Checklist Kepatuhan Final**:
  - [x] Repositori GitHub publik ([https://github.com/mocharil/gali](https://github.com/mocharil/gali)).
  - [x] Tidak ada rahasia atau API key yang bocor (`gitleaks detect -v` bersih).
  - [x] Tanggal commit pertama: 28 Agustus 2026 (memenuhi syarat ≥ 19 Agustus 2026).
  - [x] Disclaimer investasi terpasang di root layout web footer, `README.md`, dan `/methodology`.
  - [x] Tidak ada fungsi eksekusi perdagangan (*trading execution*) dalam bentuk apa pun.
  - [x] Sectors API terbukti sebagai sumber data inti (405 kredit terpakai di `ops.credit_ledger`).
  - [x] Seluruh link produksi hidup dan dapat diakses dari mode penyamaran (*incognito*).
  - [x] Release tag `v1.0.0` dibuat.
- **Status Freeze**: Repositori siap dibekukan untuk penjurian akhir.

---

## 📊 Matriks Ringkasan Verifikasi Teknis

| Parameter / Gate | Ambang Batas | Hasil Terverifikasi | Status |
|---|---|---|:---:|
| **Disiplin Anggaran Kredit** | $\le 950$ Kredit | **405 / 1000 Kredit** | ✅ **LULUS** |
| **Reproducibility DR** | 0 Kredit saat Rebuild | **0 Kredit Baru** (Ledger tetap 405) | ✅ **LULUS** |
| **Zero-Shock Invariant** | Delta RBV $= 0.0\%$ | **0.0% Persis di Semua Emiten** | ✅ **LULUS** |
| **Kecepatan Server API** | p50 Server Process $< 100$ ms | **87.1 ms** (`GET /v1/rankings`) | ✅ **LULUS** |
| **Rate Limiting Produksi** | Trigger HTTP 429 pada Burst | **142 / 160 Request Terblokir 429** | ✅ **LULUS** |
| **CORS Lockdown** | Tolak Domain Tak Terdaftar | **Reflected Origin Ditolak** | ✅ **LULUS** |
| **Audit Gitleaks** | 0 Temuan Rahasia | **0 Leaks Detected (Exit 0)** | ✅ **LULUS** |
| **Playwright E2E Tests** | 100% Passing | **4 / 4 Suites Hijau** | ✅ **LULUS** |
| **Lint & Typecheck** | 0 Ruff & Mypy Errors | **80 Source Files Clean** | ✅ **LULUS** |
| **Deployment Publik** | 8 Route Hidup di URL Publik | **100% Aktif di Vercel** | ✅ **LULUS** |

---

*Laporan disiapkan untuk peninjauan resmi peserta & tim juri Sectors Hackathon 2026.*
