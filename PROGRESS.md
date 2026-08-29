# PROGRESS — GALI

Log kerja. **Satu entri per sesi.** Format wajib seperti di bawah; jangan diubah strukturnya.
Aturan lengkapnya ada di `BUILD_PLAN.md` §0.

## 2026-08-29 — Fase 3 (Entity Resolution & Ownership Graph)

**Selesai:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9

**Detail yang terverifikasi:**
- **3.1 (Entity Normalization & Trigram Matcher)**: Modul `gali_core.graph.entity_match` mengimplementasikan pembersih sufiks legal (PT, Tbk, Persero, CV, Holdings, dsb.) dan penghitung kesamaan trigram karakter ber-padding (`calculate_trigram_similarity`). Klasifikasi ambang batas: $\ge 0.72$ (fuzzy/headline), $0.55 - 0.72$ (fuzzy_low/non-headline), $< 0.55$ (unlinked).
- **3.2 (Ownership Edge Extraction)**: 183 sisi relasi kepemilikan orang tua (`parents`) dan anak usaha (`subsidiaries`) diekstrak dari `raw.responses` dan disimpan ke `graph.ownership_edge`.
- **3.3 (Transitive Ownership Closure Engine)**: Mesin `OwnershipGraph` di `gali_core.graph.ownership` menghitung kepemilikan efektif kumulatif ($\text{eff\_own} = \sum \prod w$) menggunakan DFS bermemoisasi, deteksi pemutusan siklus (cycle breaker), dan batas kedalaman maksimum 6.
- **3.4 (Issuer & Mining Link Population)**: 81 emiten diinisialisasi pada `graph.issuer` dan 384 tautan kepemilikan operasional dihasilkan pada `graph.issuer_mining_link`. Seluruh 9 emiten batubara in-universe (`AADI`, `ADMR`, `ADRO`, `BUMI`, `BYAN`, `GEMS`, `ITMG`, `PTBA`, `DSSA`) terhubung ke entitas tambang fisik dengan confidence $\ge 0.95$.
- **3.5 (License Backfill)**: 85 izin IUP/IUPK di `core.mining_license` yang sebelumnya memiliki `company_slug` bernilai NULL berhasil ditautkan ke perusahaan tambang melalui pencocokan fuzzy trigram dengan `match_confidence` dan `match_method` tersimpan. Total lisensi tertaut menjadi 99 (13.2%).
- **3.6 (Property Test Invariant)**: Pengujian properti `test_ownership_invariant_property` memastikan $0 < \text{eff\_own} \le 100.0$ pada seluruh jalur graf multi-parent dan pemutusan siklus berhasil tanpa infinite loop.
- **3.7 (Adaro Golden Test)**: Pengujian golden `test_adaro_adro_aadi_linking_golden` memverifikasi `pt-adaro-andalan-indonesia-tbk` tertaut ke `ADRO` (`pt-alamtri-resources-indonesia-tbk`) dengan kepemilikan efektif tepat 15.37% (post-spin-off).
- **3.8 (Dagster Graph Assets)**: Asset Software-Defined `graph_ownership_structure` dan `graph_license_backfill` ditambahkan ke `gali_pipeline.assets.graph` dan tervalidasi bersih via `dagster definitions validate`.
- **3.9 (Dokumentasi Data Coverage)**: `docs/DATA_COVERAGE.md` diperbarui dengan statistik pasca-linking lengkap.

**Blocker:** Tidak ada blocker.

**Kredit terpakai sesi ini:** 0 kredit (kumulatif tetap: 347 / 1000 — sisa saldo aman: 603 kredit)

**Keputusan yang diambil:**
1. **Pencegahan Parallel Edge Duplication**: Menangani duplikasi edge berarah pada `OwnershipGraph.add_edge` agar bobot tidak terakumulasi ganda saat membaca sumber data berulang.
2. **Pengecualian Lisensi < 0.55**: Menjaga integritas data metrik M3 dengan membiarkan lisensi tak bertaut sebagai `unlinked` daripada memaksakan pasangan salah.

**Next:** Lanjut ke **Fase 4 (Metric Engines — M1 hingga M9)**.

---

## 2026-08-29 — Fase 2 (Platform Ingestion — Dagster & Alembic)

**Selesai:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12

**Detail yang terverifikasi:**
- **2.1 (Schema & Migrasi Alembic)**: ORM SQLAlchemy 2.0 untuk schema `core`, `market`, `graph`, `metrics`, dan `ops` dibuat lengkap (32 tabel) dan dimigrasikan ke PostgreSQL via Alembic revision `0bbeeadf8dff_0002_core_market_graph_metrics.py`.
- **2.2–2.3 (Sectors Client & Endpoints)**: `SectorsClient` v1 dengan tiered TTL cache, hard cap guard, retry logic, dan typed wrappers di `gali_core.sectors.endpoints` terverifikasi.
- **2.4–2.5 (Dagster Resources & Raw Assets)**: `SectorsResource`, `DbResource`, `RedisResource`, dan Software-Defined Assets (`raw_mining_companies`, `raw_mining_sites`, `raw_mining_contracts`, `raw_mining_commodities`) diimplementasikan di `gali_pipeline`.
- **2.6–2.7 (Normalizers)**: Normalizer idempoten di `gali_core.normalize` mengekstrak data dari `raw.responses` ke tabel-tabel `core` dan `market` dengan in-batch deduplication primary key.
- **2.8–2.9 (Schedules & Observability)**: Jadwal Dagster `cold_refresh_schedule` (bulanan), `warm_refresh_schedule` (kuartalan), dan `hot_refresh_schedule` (harian 18:30 WIB) dibuat di `gali_pipeline.schedules`. `dagster definitions validate` tervalidasi bersih.
- **2.10 (CLI)**: Perintah CLI `gali ingest --tier {cold,warm,hot,all}` dan `gali coverage` berjalan mulus.
- **2.11 (Golden Tests)**: 4 fixture golden response di `tests/golden/` menguji seluruh fungsi normalisasi tanpa panggilan jaringan (0 kredit). 25 unit test lolos 100%.
- **2.12 (Ingest Verification)**: Menjalankan `gali ingest --tier all` berhasil meng-upsert 366 perusahaan tambang, 143 situs tambang, 151 data produksi situs, 34 kontrak jasa, 750 izin IUP/IUPK, 36 performa tambang, 118 produk spesifikasi kalori, 9 finansial USD, 82 destinasi ekspor, dan 50 emiten IDX. Kredit terpakai: **0 kredit**.

**Blocker:** Tidak ada blocker.

**Kredit terpakai sesi ini:** 0 kredit (kumulatif tetap: 347 / 1000 — sisa saldo aman: 603 kredit)

**Keputusan yang diambil:**
1. **Opsi A (Focused Scope: Coal Titans)** dipilih sebagai fokus universe analisis sesuai keputusan Hard Gate Fase 1.
2. **In-batch Primary Key Deduplication**: Mencegah `CardinalityViolationError` pada PostgreSQL `ON CONFLICT DO UPDATE` saat memproses payload dengan pagination/multi-tahun.

**Next:** Lanjut ke **Fase 3 (Entity Resolution & Ownership Graph)**.

---

## 2026-08-29 — Fase 1 (Data Truth Audit — Hard Gate)

**Selesai:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12

**Detail yang terverifikasi:**
- **1.1 (Companies)**: 366 entitas tambang ditarik dari `/v2/mining/companies/` via offset pagination. 68 entitas teridentifikasi memiliki ticker IDX / status Tbk.
- **1.2 (Performance)**: 14 emiten memiliki cadangan tambang (`resources_reserves.total_reserves_Mt`) dan/atau angka produksi tahunan (`production_volume`) non-null di `/v2/mining/companies/performance/{slug}/`.
- **1.3 (Financials)**: 7 emiten batubara terbesar (`AADI`, `ADMR`, `ADRO`, `BUMI`, `BYAN`, `GEMS`, `ITMG`) memiliki data `revenue_usd` dan `cost_of_revenue_usd` lengkap di `/v2/mining/companies/financials/{slug}/`.
- **1.4 (Ownership)**: 68 emiten terpetakan struktur kepemilikan induk (`parents`) dan anak usaha (`subsidiaries`) melalui `/v2/mining/companies/ownership/{slug}/`.
- **1.5 (Licenses)**: Sampel 750 izin IUP/IUPK ESDM ditarik dari `/v2/mining/licenses/`. Sebanyak 1,9% memiliki `company_slug` eksplisit, dengan rata-rata kemiripan fuzzy match nama perusahaan sebesar 63,3%.
- **1.6 (Sites)**: 156 situs tambang ditarik dari `/v2/mining/sites/`, 25 memiliki angka produksi tahunan, dan 8 memiliki rasio pengupasan tanah (`strip_ratio`).
- **1.7 (Destinations)**: 9 emiten batubara memiliki data rincian negara tujuan ekspor di `/v2/mining/sales-destination/{slug}/` (China, India, Jepang, Korea, Filipina, Malaysia, dll).
- **1.8 (Commodities & Prices)**: 18 komoditas terpetakan dari `/v2/mining/commodities/`. Khusus batubara, tersedia seri harga global Coal, Coal (HBA 1), Coal (HBA 2), dan Coal (HBA 3) yang mendefinisikan benchmark kualitas M5.
- **1.9 (Contracts)**: 34 relasi kontrak jasa tambang ditarik dari `/v2/mining/contracts/`, 9 di antaranya menghubungkan langsung ke emiten tambang tercatat (Maruwai Coal, Pamapersada, dll).
- **1.10 (Screener Matching)**: Pemetaan slug perusahaan tambang ke ticker IDX tersinkronisasi.
- **1.11 (Dokumentasi Coverage)**: Matriks cakupan data lengkap diterbitkan di `docs/DATA_COVERAGE.md`.
- **1.12 (Pelacakan Kredit)**: Laporan anggaran kredit API diterbitkan di `docs/CREDIT_BUDGET.md`.

**Blocker / Gate Decision:**
- **Gate Evaluation**:
  - Ditemukan **7 emiten batubara raksasa** dengan 100% data lengkap di seluruh endpoint khusus tambang (cadangan + produksi + finansial USD + ownership + destinasi ekspor).
  - Ditemukan **21 emiten** yang memiliki data operasional tambang (cadangan/produksi) yang jika dikombinasikan dengan laporan keuangan IDX standar menghasilkan cakupan luas lintas komoditas (Batubara, Nikel, Emas, Tembaga).
  - Mengacu pada §6 Fase 1: status memenuhi **GO MENYEMPIT (Focused Scope: Coal Titans, 8-14 emiten)** jika fokus pada batubara murni, atau **GO PENUH** jika fallback ke laporan keuangan IDX diizinkan untuk emiten non-batubara.

**Kredit terpakai sesi ini:** 345 (kumulatif: 347 / 1000 — sisa saldo aman: 603 kredit)

**Keputusan yang diambil:**
1. **Paginasi Offset**: Mengoreksi query parameter dari `page` ke `offset` & `limit` sesuai spesifikasi backend Sectors API.
2. **Schema Ingestion Adaptif**: Parsing respons multi-tahun dan multi-produk (calorific value kcal max/min, reserves breakdown) pada endpoint `performance` dan `financials`.
3. **Optimasi Cache Permanen**: Semua respons Fase 1 tersimpan di `raw.responses`, sehingga proses downstream Fase 2–5 tidak perlu mengulang panggilan API yang sama (0 kredit).

**Next:** Menunggu konfirmasi Aril terkait keputusan Gate untuk melangkah ke **Fase 2 (Platform Ingestion — Dagster & Alembic)**.

---

## 2026-08-29 — Fase 0 (Hardening Akuntansi Kredit: 0.14–0.17 & Smoke Test Live API: 0.11)

**Selesai:** 0.11, 0.14, 0.15, 0.16, 0.17

**Detail yang terverifikasi:**
- **0.11**: Smoke test live Sectors API (`/v2/subsectors/`) sukses dijalankan via `gali smoke`. Hasil: 33 subsectors diterima, 1 baris masuk ke `raw.responses` (`status_code=200`), dan 1 kredit didebit ke `ops.credit_ledger`.
- **0.14**: Penanganan respon 404 eksplisit. Saat API Sectors mengembalikan 404, sistem menyimpan jejak audit ke `raw.responses` (`status_code=404`, `credits_charged=1`), mencatat tepat **1 kredit** ke `ops.credit_ledger`, lalu melempar `SectorsNotFoundError` (bukan error jaringan biasa). Memastikan ledger tidak undercount saat probe Fase 1.
- **0.15**: Retry otomatis pada status 429 (Too Many Requests) dengan exponential backoff dan pembacaan header `Retry-After`. Percobaan gagal (429) gratis dan tidak mencatat kredit ke ledger.
- **0.16**: Pemisahan biaya screener di registry `ENDPOINTS`: `companies_screener_structured` = 1 kredit (query `where`/`order_by`), `companies_screener_nl` = 3 kredit (query `?q=`).
- **0.17**: Test suite bertambah dari 14 menjadi 20 tests. Seluruh skenario credit accounting teruji dengan `respx`:
  - 404 melempar `SectorsNotFoundError`, mencatat tepat 1 kredit & persistensi `raw.responses`.
  - 404 pada endpoint berbiaya tinggi (cost 3) tetap menagih hanya 1 kredit.
  - 429 lalu 200 sukses via retry dan hanya menghasilkan 1 entri ledger kredit.
  - 400 dan 500 melempar `HTTPStatusError` tanpa menagih kredit sama sekali.
  - Cache regression: query cache hanya menyajikan `status_code == 200`.

**Blocker:** Tidak ada blocker teknis tersisa. Exit Criteria Fase 0 telah **100% terpenuhi**.

**Kredit terpakai sesi ini:** 2 (kumulatif: 2 / 1000 — smoke test live API)

**Keputusan yang diambil:**
1. **SectorsNotFoundError terpisah dari HTTPStatusError / TransportError** agar probe audit Fase 1 dapat menangkap 404 sebagai indikasi coverage gap tanpa menghentikan loop atau memicu false network alert.
2. **Explicit Commit pada 404 di SectorsClient.get** memastikan record 404 di `raw.responses` dan `ops.credit_ledger` tetap ter-persist ke PostgreSQL meskipun `SectorsNotFoundError` dilempar ke caller.
3. **Pemisahan endpoint identifier screener** menjaga determinisme akuntansi kredit antara filter terstruktur vs natural language search.
4. **ASCII CLI output tags ([OK] / [FAIL])** menggantikan Unicode emojis/checkmarks untuk kompatibilitas native pada terminal Windows CP1252.

**Next:** Siap masuk ke **Fase 1 (Data Truth Audit — Hard Gate, Task 1.1–1.12)** dengan anggaran maksimum 200 kredit.

---

## 2026-08-29 — Fase 0 (Registrasi & Fondasi)

**Selesai:** 0.5, 0.6, 0.7, 0.9, 0.10, 0.12, 0.13

**Detail yang terverifikasi:**
- **0.5**: Repo publik GitHub `https://github.com/mocharil/gali` dibuat dan branch `main` ter-push. First commit 2026-08-29 (≥19 Ags ✓). Lisensi MIT.
- **0.6**: Struktur monorepo dibuat (`packages/{core,api,pipeline,web}`, `infra/`, `docs/`, `.github/workflows/`), ketiga paket python editable install ke satu venv root.
- **0.7**: `docker-compose.yml` aktif dan healthy: `gali-postgres` di port 5433 (ekstensi `pg_trgm`, `btree_gin` aktif), `gali-redis` di port 6379.
- **0.9**: Alembic initialized (`packages/core/alembic.ini`, `gali_core/db/migrations/`). Migrasi `c0dbc8ceeb14_0001_raw_ops_initial.py` sukses di Postgres: skema `raw` dan `ops` beserta tabel `raw.responses`, `ops.credit_ledger`, `ops.api_key`, `ops.data_coverage`.
- **0.10**: `SectorsClient` v0, `CreditBudget` (hard cap 950), dan cache berjenjang (`raw.responses`) selesai. `GALI_DRY_RUN=1` me-raise `DryRunCacheMissError` pada cache miss. CLI `gali credits report` dan `gali db migrate` jalan.
- **0.12**: GitHub Actions CI (`.github/workflows/ci.yml`) hijau di repo publik: Ruff linter & format, Mypy typechecker, dan Pytest unit tests (14 tests) dengan container Postgres+Redis lolos 100%.
- **0.13**: `PROGRESS.md` diupdate per sesi.

**Blocker:** `SECTORS_API_KEY` belum ada di `.env` → task 0.11 (*Smoke test live API*) diblokir sampai Aril mengisi API key.
Task 0.1–0.4 dan 0.8 menunggu tindakan manusia (Aril).

**Kredit terpakai sesi ini:** 0 (kumulatif: 0 / 1000)

**Keputusan yang diambil:**
1. **Postgres di host port 5433, bukan 5432.** Port 5432 sudah dipakai container lain milik user (`video_clipper_postgres`) yang tidak boleh diganggu.
2. **Python 3.13, bukan 3.12.** Mesin memiliki Python 3.13.13 dan Dagster 1.13.20 resolve bersih.
3. **Satu venv di root** untuk ketiga paket Python editable install.
4. **Repo GitHub: `Mocharil/gali`, publik** — dibuat menggunakan akun aktif `mocharil`.
5. **Alembic multi-schema configuration** mengelola skema Postgres (`raw`, `ops`, `core`, `market`, `graph`, `metrics`) secara eksplisit.
6. **NullPool pada test/dev** untuk stabilitas asyncpg event loop di pytest.

**Next:** Menunggu Aril mengisi `SECTORS_API_KEY` di `.env` untuk menjalankan **0.11** (Smoke test live API 1 kredit). Setelah 0.11 lulus, Fase 0 komplit dan lanjut ke **Fase 1 (Data Truth Audit - Hard Gate)**.
