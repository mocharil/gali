# Prompt untuk Agent Pelaksana

> **Sesi 7 ada di bawah ini.** Sesi 1-6 diarsipkan di bagian bawah file.
> Selalu paste blok sesi terbaru.

---

# SESI 7 — Raw asset yang hilang (blocker task 7.1/6.9), lalu lanjut Fase 7 (7.2–7.9)

## ▼ SALIN MULAI DARI SINI ▼

Lanjutkan proyek **GALI** di `C:/Users/Aril Indra Permana/Sectors_App`
(repo: https://github.com/mocharil/gali).

### Baca dulu, wajib

1. `PROGRESS.md`, dua entri teratas (tanggal 2026-08-31, keduanya)
2. `BUILD_PLAN.md` task **2.5**, **2.7** (baru dikoreksi, dulu salah dicentang penuh), **7.1**
   (juga baru dikoreksi), dan 7.2–7.9
3. `.env.production` — **jangan pernah commit, print isinya ke log, atau ke PR**. `SECTORS_API_KEY`
   sudah terisi di sana dan sudah di-set sebagai GitHub secret — jangan diprint ulang untuk verifikasi,
   cukup cek panjangnya (`wc -c` atau `.Length`) kalau perlu.

### Konteks

Sesi lalu (Sesi 6) berhasil memperbaiki dua bug keamanan nyata (CORS wildcard-refleksi, rate limiting
yang tidak pernah ada) dan sudah live-deploy + verified di production. Sesi setelahnya (koordinator)
memperbaiki `SECTORS_API_KEY` yang kosong dan beberapa GitHub secret yang kena BOM (`\ufeff`), sampai
`refresh.yml` (workflow task 7.1) akhirnya jalan **hijau** (`run 33351554887`).

**Tapi run hijau itu ternyata 0-credit no-op — bukan bukti task 7.1 selesai.** `gali ingest --tier
hot` (satu-satunya langkah di `refresh.yml`) cuma me-normalize ulang baris `raw.responses` yang SUDAH
ADA ke tabel `core.*`/`market.*` — ia **tidak pernah memanggil Sectors API sama sekali**. Ini fitur
yang benar untuk task 7.4 (rebuild-from-raw 0-kredit), tapi salah dipakai sebagai satu-satunya langkah
"refresh data harian".

**Akar masalah, ditelusuri ke `packages/pipeline/gali_pipeline/assets/raw.py`:** ini satu-satunya kode
yang benar-benar memanggil `SectorsClient.get()` untuk data live (asset dengan
`compute_kind="sectors_api"`). **Hanya ada 4 raw asset, semuanya cold tier:**
`raw_mining_companies`, `raw_mining_sites`, `raw_mining_contracts`, `raw_mining_commodities` (yang
terakhir ini cuma fetch `/v2/mining/commodities/` — daftar nama komoditas — BUKAN time-series harga
`/v2/mining/commodities/{name}/price/`).

**Yang tidak pernah dibangun sama sekali** (walau metadata endpoint-nya sudah lengkap terdaftar di
`gali_core/sectors/endpoints.py`, dan walau task 2.5/2.7 di `BUILD_PLAN.md` sempat dicentang penuh
seolah sudah ada):
- Raw asset untuk endpoint **warm tier**: performance, financials, ownership, sales-destination per
  company (`/v2/mining/companies/{performance,financials,ownership}/{slug}/`,
  `/v2/mining/sales-destination/{slug}/`)
- Raw asset untuk endpoint **hot tier**: harga komoditas time-series
  (`/v2/mining/commodities/{name}/price/`), `/v2/companies/` screener untuk market cap
  (`companies_screener_structured` di `endpoints.py`), foreign-flow, broker, filings

Data warm/hot yang sekarang ada di `raw.responses` murni hasil seed manual satu-kali sewaktu Fase 1
(Data Truth Audit) — bukan dari pipeline yang bisa dijadwalkan ulang. Ini juga akar penyebab
`/divergence` (task 6.9) menampilkan "market cap belum ter-ingest" untuk semua 9 emiten — bukan
keterbatasan data Sectors, tapi memang belum pernah dicoba fetch lewat mekanisme yang benar.

### Prioritas sesi ini: TUTUP GAP INI DULU (Langkah 1–3), baru lanjut sisa Fase 7 (Langkah 4–9)

### Langkah 1 — Raw asset harga komoditas time-series (paling murah, paling langsung dibutuhkan 7.1)

1. Di `packages/pipeline/gali_pipeline/assets/raw.py`, tambah asset baru mengikuti pola persis
   `raw_mining_commodities` yang sudah ada — pakai `client.get(endpoint="/v2/mining/commodities/{name}/price/",
   tier="hot", credit_cost=1, run_id="dagster_ingest")` untuk komoditas yang relevan dengan universe
   (batubara/"Coal" minimal — cek nama persis yang diterima endpoint dari data `raw.responses` yang
   sudah ada hasil seed Fase 1, `SELECT DISTINCT endpoint FROM raw.responses WHERE endpoint LIKE
   '/v2/mining/commodities/%/price/'` untuk tahu nama komoditas yang pernah dicoba)
2. Daftarkan asset baru ini di `packages/pipeline/gali_pipeline/assets/__init__.py` (masuk
   `RAW_ASSETS`/`ALL_ASSETS`)
3. Perbaiki `hot_job` di `packages/pipeline/gali_pipeline/schedules.py` — selection-nya sekarang
   `AssetSelection.groups("market") | AssetSelection.assets("core_commodity_prices")`, yang cuma
   normalizer. Tambahkan asset raw yang baru ke selection ini (dan/atau pakai `.upstream()` yang
   tepat) supaya materialize `hot_job` benar-benar memicu fetch live, bukan cuma re-normalize.

### Langkah 2 — Raw asset market cap screener (butuh hati-hati, biaya kredit + syntax belum pasti)

`BUILD_PLAN.md` task 6.9 sudah mencatat peringatan ini dari sesi lampau — **jangan diabaikan**:
"Syntax `where` clause perlu dicek ulang ke dokumentasi Sectors sebelum mencoba — belum dikerjakan
sesi ini untuk menghindari trial-and-error yang boros kredit."
1. Cek dokumentasi Sectors API (`docs.sectors.app`) untuk syntax query `/v2/companies/` structured
   screener (`companies_screener_structured` di `endpoints.py`, `where`/`order_by` params) — pastikan
   filter `symbol IN (...)` untuk 9 simbol in-universe (lihat `IN_UNIVERSE_SYMBOLS` di
   `gali_core/config.py`) benar-benar valid sebelum memanggil API sungguhan
2. Test dulu dengan **1 simbol** untuk konfirmasi shape response dan biaya kredit aktual sebelum
   memanggil untuk semua 9 — `credit_cost=1` di metadata mungkin per-call, bukan per-simbol, tapi
   verifikasi nyata lebih murah daripada asumsi salah
3. Tambah raw asset baru (pola sama seperti Langkah 1) untuk endpoint ini, daftarkan di `__init__.py`
4. `market_idx_companies` (normalizer yang sudah ada) akan otomatis mengisi `market_cap_idr` begitu
   raw response market cap tersedia — verifikasi dengan query langsung ke `market.idx_company` setelah
   materialize, lalu cek `/divergence` di web (lokal dulu, baru production) benar-benar terisi
5. **Ini akan menghabiskan kredit sungguhan** (kecil, tapi nyata) — catat di `ops.credit_ledger` dan
   `docs/CREDIT_BUDGET.md` seperti biasa. Total masih jauh di bawah 950, tidak perlu izin Aril untuk
   jumlah sekecil ini, tapi **dokumentasikan angka pastinya**

### Langkah 3 — Perbaiki `refresh.yml` supaya benar-benar fetch, verifikasi ulang task 7.1

1. `.github/workflows/refresh.yml` yang sudah ada (dari Sesi 6) perlu langkah tambahan **sebelum**
   `gali ingest --tier hot`: materialize asset Dagster yang baru dibuat (mis.
   `dagster asset materialize -f packages/pipeline/gali_pipeline/definitions.py --select
   'raw_mining_commodity_prices,raw_companies_screener'` — sesuaikan nama asset persis yang dipakai di
   Langkah 1–2), baru diikuti `gali ingest --tier hot` untuk normalize hasilnya ke `core`/`market`
2. Install `packages/pipeline` (bukan cuma `packages/core`) di job step "Install dependencies" kalau
   belum — perlu `dagster` terpasang untuk `dagster asset materialize`
3. Trigger manual (`gh workflow run refresh.yml -f tier=hot -f dry_run=false`), **verifikasi ledger
   kredit sungguhan bertambah** (bandingkan `ops.credit_ledger` sebelum/sesudah — 404 sebelumnya,
   harus lebih besar sesudah run ini kalau berhasil fetch live)
4. Trigger ≥2 run tak berawak (manual atau tunggu jadwal), screenshot run history sebagai bukti untuk
   video Fase 8
5. **Baru sekarang** centang task 7.1 penuh di `BUILD_PLAN.md`, dengan bukti kredit bertambah — bukan
   cuma run hijau

### Langkah 4 — Sentry (7.2) — **STOP, minta Aril bikin akun & kirim DSN**
Sama seperti prompt Sesi 6: Sentry SDK sudah ter-init di `main.py`, `SENTRY_DSN` masih kosong. Minta
Aril buat akun sendiri, kirim DSN, baru lanjut set env var + redeploy + uji error + verifikasi masuk
dashboard.

### Langkah 5 — Load test (7.3)
k6/locust, 50 rps ke `/v1/rankings` dan `POST /v1/scenario` (body kosong). Rate limiter (Sesi 6) akan
kena di 50 rps kalau anon (60/menit) — putuskan sendiri strategi (API key valid, atau load test
sebelum rate limit terpasang secara logis tidak relevan lagi karena sudah terpasang; jalankan dengan
API key 600/menit atau turunkan rps target) dan dokumentasikan alasannya. Catat p50/p95/p99 di
`docs/ARCHITECTURE.md`.

### Langkah 6 — Disaster recovery (7.4) — **konfirmasi ke Aril sebelum eksekusi (destruktif)**
`DROP`/kosongkan schema `core`/`market`/`graph`/`metrics` di Neon **production**, rebuild dari `raw`
(sekarang raw sudah lebih lengkap berkat Langkah 1–2), buktikan `ops.credit_ledger` selisih 0 untuk
langkah rebuild ini spesifik (bukan untuk seluruh sesi — fetch di Langkah 1–2 tetap menghabiskan
kredit, itu memang tujuannya).

### Langkah 7 — Audit keamanan (7.5)
CORS dan rate limiting sudah beres dari Sesi 6. Sisanya: `gitleaks detect -v` (0 temuan wajib, laporkan
dulu ke Aril kalau ada temuan sebelum rewrite history), verifikasi error handler tidak bocor internal
detail.

### Langkah 8 — Dokumentasi (7.6–7.9)
`docs/ARCHITECTURE.md` final + diagram + catat gap raw asset yang baru ditutup sesi ini sebagai bagian
sejarah arsitektur (bukan disembunyikan). `README.md` quickstart teruji dari nol + badge CI. Snapshot
Neon didokumentasikan. Alembic upgrade/downgrade/upgrade di DB bersih/lokal. CI tetap hijau.

### Definisi selesai sesi ini

1. Raw asset harga komoditas + market cap screener ada, terdaftar, dan **terbukti memanggil Sectors
   API sungguhan** (kredit bertambah di ledger, bukan 0)
2. `hot_job`/`refresh.yml` diperbaiki, ≥2 run tak berawak nyata dengan kredit terpakai > 0 tercatat
3. `/divergence` di web (production) menampilkan market cap dan RBV gap yang terisi, bukan lagi
   empty-state — verifikasi live di browser
4. Task 7.1, 2.5, 2.7 di `BUILD_PLAN.md` dicentang ulang dengan jujur berdasarkan bukti di atas
5. Sentry live (atau eksplisit diblok menunggu Aril)
6. Load test selesai, p50/p95/p99 tercatat
7. Rebuild-from-raw dibuktikan 0 kredit tambahan
8. `gitleaks` bersih
9. `docs/ARCHITECTURE.md`, `README.md` (+ badge), `PROGRESS.md` terupdate jujur
10. Commit + push per langkah, CI hijau tiap push

### Kapan berhenti dan bertanya

- Akun Sentry (Langkah 4) — selalu berhenti
- Syntax query `/v2/companies/` screener (Langkah 2) belum pernah divalidasi terhadap API sungguhan di
  proyek ini — kalau hasil test 1-simbol tidak sesuai ekspektasi (shape aneh, kredit lebih mahal dari
  perkiraan), **berhenti dan laporkan sebelum lanjut ke 9 simbol**, jangan trial-and-error boros kredit
- `DROP`/`TRUNCATE` schema production (Langkah 6) — konfirmasi dulu ke Aril
- Temuan `gitleaks` — laporkan dulu sebelum rewrite history
- Kalau ditemukan checkbox palsu lain sekelas 2.5/2.7/7.1 — perbaiki di sumbernya kalau scope-nya
  kecil, atau catat jujur di `PROGRESS.md` + `BUILD_PLAN.md` kalau scope-nya besar (seperti sesi ini),
  jangan dibiarkan diam-diam

## ▲ SALIN SAMPAI SINI ▲

---

<details>
<summary><b>Arsip — Prompt Sesi 6</b></summary>

# SESI 6 — Production Hardening (Fase 7: 7.1–7.9) + 2 bug keamanan ditemukan saat review — **Bug 1
(CORS) dan Bug 2 (rate limiting) selesai & deployed; task 7.1 dieksekusi tapi ternyata 0-credit no-op,
lihat Sesi 7**

## ▼ SALIN MULAI DARI SINI ▼

Lanjutkan proyek **GALI** di `C:/Users/Aril Indra Permana/Sectors_App`
(repo: https://github.com/mocharil/gali).

### Baca dulu, wajib

1. `PROGRESS.md`, entri teratas ("Task 5.11b & 6.15: Deploy produksi ke Vercel")
2. `BUILD_PLAN.md` Fase 7 (task 7.1–7.9) dan task 5.6 (rate limiting — **status checkbox tidak bisa
   dipercaya**, lihat di bawah)
3. `.env.production` di root repo — **jangan pernah commit, print isinya ke log, atau ke PR**

### Konteks

API dan Web sudah live dan **diverifikasi end-to-end sungguhan**:
- API: `https://gali-api.vercel.app`
- Web: `https://gali-web.vercel.app`

Semua 8 route web diverifikasi via browser sungguhan, termasuk Scenario Studio yang memicu compute
live (slider -5% → delta -5.0% real-time dari API), dan invariant zero-shock `POST /v1/scenario`
persis 0.0% di infrastruktur produksi (Neon + Upstash + Vercel sekaligus).

**Dua bug keamanan nyata ditemukan saat review akhir sebelum sesi ini dimulai:**

**Bug 1 — CORS sebenarnya tidak pernah terkunci (sudah diperbaiki lokal, BELUM commit/deploy).**
`packages/api/gali_api/main.py` ternyata memakai daftar origin **hardcoded** berisi `"*"`
dikombinasikan dengan `allow_credentials=True` — bukan `settings.cors_origins` (dibaca dari env var
`CORS_ALLOW_ORIGINS`) sama sekali. Starlette, ketika `"*"` ada di `allow_origins` DAN
`allow_credentials=True`, tidak bisa mengirim header `Access-Control-Allow-Origin: *` (dilarang spec
untuk request ber-credential) — sebagai gantinya ia me-refleksikan Origin request APAPUN secara
verbatim. Efeknya: CORS **tidak pernah membatasi apa pun**, walaupun `CORS_ALLOW_ORIGINS` sempat
"diperbaiki" ke `https://gali-web.vercel.app` di env var Vercel sesi lalu — env var itu tidak pernah
benar-benar dibaca kode yang jalan. Pola ini persis sama seperti bug `NEXT_PUBLIC_API_BASE_URL` di
sesi sebelumnya (env var yang di-set tapi tidak pernah dibaca kode).
Sudah diedit lokal di working tree (belum commit): `main.py` sekarang memakai
`get_settings().cors_origins`, hardcoded list + `"*"` dihapus. `ruff check` sudah hijau untuk file
ini. **Belum diverifikasi dengan origin yang TIDAK di-allowlist** — verifikasi sesi lalu cuma menguji
origin yang memang diizinkan, makanya bug wildcard-refleksi ini lolos tidak terlihat.

**Bug 2 — Rate limiting tidak pernah diimplementasikan (task 5.6 checkbox salah, bukan cuma belum
diverifikasi).** Pencarian menyeluruh (`grep -rn "limiter\|Limiter\|429\|slowapi" packages/api`) tidak
menemukan satu baris kode pun. `RATE_LIMIT_ANON_PER_MIN`/`RATE_LIMIT_KEYED_PER_MIN` sudah ada sebagai
`Settings` field (`packages/core/gali_core/config.py`) dan terisi di `.env.production` (60/600), tapi
tidak ada middleware/dependency manapun yang membacanya. API publik saat ini bisa di-hit tanpa batas.

### Keputusan arsitektur yang berlaku (jangan didiskusikan ulang, langsung ikuti)

**Dagster daemon tidak akan dideploy sebagai proses persisten.** Fly.io permanen tidak tersedia (Aril
tidak punya kartu kredit — pendorong pivot ke Vercel di sesi lalu). Vercel Python Functions itu
serverless/stateless — tidak bisa menjalankan scheduler Dagster yang perlu proses hidup terus-menerus.
Jadi task 7.1 (jadwal `hot_refresh` harian + bukti ≥2 run tak berawak) dikerjakan lewat **GitHub
Actions scheduled workflow** yang memanggil CLI `gali ingest --tier hot` yang sudah ada dan sudah
teruji (`packages/core/gali_core/cli.py`, command `ingest`) — ini persis fallback yang sudah disetujui
di `BUILD_PLAN.md` §8 tabel risiko ("kalau macet [dengan Dagster], jalankan asset lewat CLI + GitHub
Actions cron sambil tetap mempertahankan struktur asset"). Asset graph Dagster tetap ada di kode dan
tetap bisa didemokan lewat `dagster dev` lokal untuk video (Fase 8) — yang berubah cuma mekanisme yang
menjalankan refresh harian di produksi.

`gh` CLI sudah terautentikasi di mesin ini sebagai akun `mocharil` (scope termasuk `workflow`) — boleh
dipakai langsung untuk push workflow file dan `gh secret set`, tidak perlu minta Aril login ulang
(beda dengan Fly.io/Vercel yang butuh OAuth browser interaktif).

### Langkah 1 — Selesaikan & deploy fix CORS (Bug 1, kerjakan duluan)

1. Baca `packages/api/gali_api/main.py`, konfirmasi editan lokal (`get_settings().cors_origins`, tanpa
   `"*"`) masih ada dan masuk akal
2. Tambah regression test di `packages/api/tests/`: dengan `CORS_ALLOW_ORIGINS` di-set ke satu origin
   tertentu, request dengan header `Origin` yang **berbeda** dari itu TIDAK BOLEH mendapat header
   `Access-Control-Allow-Origin` yang cocok dengan origin request tersebut. Ini mencegah bug
   wildcard-refleksi ini kambuh diam-diam.
3. `pytest`, `ruff check`, `mypy` hijau semua
4. Commit, push, tunggu CI hijau
5. Redeploy `gali-api` ke production (`vercel deploy --prod --yes` dari root repo — `.vercel/project.json`
   sudah link ke project `gali-api`)
6. **Verifikasi nyata dengan DUA test, bukan satu:**
   ```bash
   # (a) origin yang diizinkan -> harus reflect balik origin itu
   curl -s -i -H "Origin: https://gali-web.vercel.app" https://gali-api.vercel.app/health | grep -i access-control-allow-origin
   # (b) origin BUKAN yang diizinkan -> header ini TIDAK BOLEH muncul/cocok
   curl -s -i -H "Origin: https://evil-example.com" https://gali-api.vercel.app/health | grep -i access-control-allow-origin
   ```
   Kalau test (b) masih mengembalikan `https://evil-example.com`, fix belum benar — jangan tandai selesai.
7. Update `BUILD_PLAN.md` task 5.6 (perbaiki deskripsi CORS, jangan hapus histori) dan `PROGRESS.md`
   dengan entri jujur soal bug ini: kapan ditemukan, kenapa lolos sebelumnya, cara verifikasi yang benar.

### Langkah 2 — Implementasikan rate limiting sungguhan (Bug 2 / bagian dari task 7.5)

1. Redis sudah tersedia lewat `gali_api.dependencies` (`_redis_client`, `init_redis_pool`) — pakai
   itu, jangan tambah dependency/infra baru (mis. `slowapi` dengan backend terpisah).
2. Implementasikan middleware/dependency FastAPI: sliding-window atau fixed-window counter per IP
   (atau per API key kalau `X-API-Key` valid ada di `ops.api_key`) di Redis, dengan limit dari
   `settings.rate_limit_anon_per_min` (60) untuk anon dan `settings.rate_limit_keyed_per_min` (600)
   untuk key valid — field-field ini sudah ada, tinggal dipakai.
3. Response saat limit terlampaui: HTTP 429 dengan body error konsisten dengan
   `global_exception_handler` yang sudah ada di `main.py`.
4. Test: request beruntun melebihi limit anon di test lokal (boleh mock waktu/pakai limit kecil khusus
   test) → pastikan request ke-N+1 dapat 429.
5. Deploy ulang, verifikasi nyata di production: skrip kecil hit `/health` >60x dalam <1 menit,
   konfirmasi ada respons 429 di suatu titik.
6. Update `BUILD_PLAN.md` 5.6 dan 7.5.

### Langkah 3 — Jadwal `hot_refresh` via GitHub Actions (task 7.1)

1. Buat `.github/workflows/refresh.yml`: `on.schedule.cron: "30 11 * * 1-5"` (18:30 WIB Senin–Jumat,
   sama seperti `hot_schedule` di `packages/pipeline/gali_pipeline/schedules.py`) + `workflow_dispatch`
   supaya bisa dipicu manual untuk verifikasi.
2. Job: checkout, setup Python 3.13 (samakan dengan `ci.yml`), install `packages/core` editable,
   jalankan `gali ingest --tier hot`.
3. Set repo secrets via `gh secret set` (satu-satu, dari nilai `.env.production` — **jangan `cat` file
   itu ke terminal log tersimpan**): `DATABASE_URL`, `DATABASE_URL_SYNC`, `REDIS_URL`,
   `SECTORS_API_KEY`, `SECTORS_CREDIT_HARD_CAP`.
4. Trigger manual run (`gh workflow run refresh.yml`), cek hijau, cek `ops.credit_ledger` bertambah
   wajar (query langsung ke Neon, jangan asumsi dari log doang).
5. Trigger sekali lagi (manual atau tunggu jadwal) supaya ada **≥2 run tak berawak** dengan timestamp
   — screenshot GitHub Actions run history untuk bukti (dipakai lagi nanti di video Fase 8).
6. Centang 7.1 di `BUILD_PLAN.md` **hanya setelah** ≥2 run nyata ada di run history, dengan link run.

### Langkah 4 — Sentry live (task 7.2) — **STOP sebelum mulai, minta Aril**

Sentry SDK sudah ter-init di `main.py` (`sentry_sdk.init(...)` kalau `settings.sentry_dsn` terisi),
tapi `SENTRY_DSN` di `.env.production` masih kosong. **Membuat akun Sentry adalah aksi akun pihak
ketiga — minta Aril bikin akun sendiri** (sama seperti aturan Neon/Upstash/Fly/Vercel sebelumnya) dan
kirimkan DSN-nya. Setelah dapat DSN:
1. Set `SENTRY_DSN` di Vercel env vars project `gali-api` (production + preview).
2. Redeploy, picu satu error uji (endpoint sementara atau exception sengaja, lalu dihapus lagi).
3. Konfirmasi error itu benar-benar masuk ke dashboard Sentry (screenshot/link event id).
4. Web (`packages/web`) tidak punya Sentry SDK terpasang sama sekali (`@sentry/nextjs` tidak ada di
   `package.json`) — task 7.2 di `BUILD_PLAN.md` menyebut "API + web" tapi implementasi nyata baru
   API. Kalau mau web juga, itu penambahan scope — tanya Aril dulu, jangan asumsi otomatis in-scope.

### Langkah 5 — Load test (task 7.3)

1. `k6` atau `locust` (pilih salah satu) — install lokal.
2. Target `https://gali-api.vercel.app/v1/rankings` dan `POST .../v1/scenario` (body kosong `{}`
   supaya hasilnya deterministik), 50 rps, durasi wajar (1-2 menit).
3. **Perhatikan rate limiter dari Langkah 2** — 50 rps akan kena 429 kalau limiter aktif di-set
   60/menit per-IP. Ini realistis (membuktikan limiter bekerja), tapi kalau tujuannya murni mengukur
   p50/p95/p99 tanpa gangguan 429, gunakan API key valid (limit 600/menit) di load test, atau jalankan
   load test SEBELUM Langkah 2 — putuskan sendiri urutan mana yang lebih jujur untuk didokumentasikan,
   catat alasannya.
4. Catat p50/p95/p99 di `docs/ARCHITECTURE.md` (buat kalau belum ada — lihat Langkah 8).

### Langkah 6 — Disaster recovery: rebuild dari `raw` (task 7.4)

1. **Kerjakan di database Neon production langsung**, bukan cuma Docker lokal — ini yang mau
   dibuktikan: produksi bisa dipulihkan tanpa kredit.
2. `DROP`/kosongkan seluruh isi schema `core`, `market`, `graph`, `metrics` (via Alembic downgrade
   terarah atau `TRUNCATE`/`DROP SCHEMA ... CASCADE` + migrate ulang — pilih yang lebih aman dan
   reversibel; **backup dulu** kalau ragu, lihat Langkah 8 soal snapshot Neon).
3. Jalankan ulang pipeline dari `raw.responses` yang sudah ada (`GALI_DRY_RUN=1` atau materialize
   Dagster asset `core_*`/`graph_*`/`metric_*` dari cache) sampai `metrics.published_pointer` terisi
   lagi dengan run baru.
4. Query `ops.credit_ledger` sebelum dan sesudah — buktikan **selisihnya 0**.
5. Verifikasi API/web tetap benar setelah rebuild (spot-check `/v1/issuers/ADRO`, zero-shock invariant).
6. Dokumentasikan langkah persis + hasil query ledger di `docs/CREDIT_BUDGET.md` atau
   `docs/ARCHITECTURE.md`.

### Langkah 7 — Audit keamanan (task 7.5)

Rate limiting dan CORS sudah ditangani Langkah 1-2. Sisanya:
1. `gitleaks detect --source . -v` — 0 temuan wajib.
2. Cek error handler global (`main.py`, `global_exception_handler`) tidak membocorkan stack
   trace/internal detail ke response — sudah terlihat aman (pesan generik saja) tapi verifikasi ulang
   dengan memicu error sungguhan dan lihat response body persis.

### Langkah 8 — Dokumentasi & housekeeping (task 7.6–7.9)

1. `docs/ARCHITECTURE.md`: tulis final, sertakan diagram (boleh Mermaid), catat p50/p95/p99 dari
   Langkah 5 dan hasil rebuild-from-raw dari Langkah 6, dan **catat pivot Fly.io→Vercel + alasan kartu
   kredit** sebagai keputusan arsitektur permanen (bukan sementara).
2. `README.md`: quickstart yang **benar-benar dijalankan dari nol** (clone baru di direktori
   sementara, ikuti langkah persis apa adanya, catat kalau ada langkah yang tidak akurat) + badge CI
   (`![CI](https://github.com/mocharil/gali/actions/workflows/ci.yml/badge.svg)`).
3. Cek dashboard Neon apakah backup/point-in-time-recovery otomatis aktif di free tier (biasanya ya,
   retensi terbatas) — dokumentasikan prosedur restore di `docs/ARCHITECTURE.md`; tidak perlu benar-benar
   mengeksekusi restore destruktif di production untuk membuktikannya.
4. Migrasi Alembic maju-mundur: `alembic upgrade head` → `alembic downgrade -1` → `upgrade head` lagi
   di database **bersih/lokal** (bukan Neon production — ini destruktif ke schema), pastikan tidak error.
5. Pastikan CI (`ci.yml`) tetap hijau setelah semua perubahan sesi ini.

### Definisi selesai sesi ini

1. Bug CORS (Bug 1) diperbaiki, di-deploy, **diverifikasi dengan origin yang ditolak, bukan cuma yang
   diizinkan**
2. Rate limiting (Bug 2) benar-benar terimplementasi, di-deploy, diverifikasi 429 muncul nyata di
   production
3. `.github/workflows/refresh.yml` ada dan sudah punya ≥2 run tak berawak nyata di history
4. Sentry live dengan DSN dari Aril, ATAU eksplisit diblok menunggu Aril (jangan skip diam-diam)
5. Load test selesai, angka p50/p95/p99 tercatat
6. Rebuild-from-raw dibuktikan di Neon production, 0 kredit terpakai
7. `gitleaks` bersih
8. `docs/ARCHITECTURE.md`, `README.md` (+ badge), `BUILD_PLAN.md`, `PROGRESS.md` semua terupdate jujur
9. Commit + push per langkah (jangan satu commit raksasa di akhir), CI hijau di tiap push

### Kapan berhenti dan bertanya

- Pembuatan akun Sentry (Langkah 4) — **selalu berhenti**, minta Aril buat sendiri dan kirim DSN
- Load test (Langkah 5) urutan vs rate limiter — putuskan sendiri dengan alasan jelas, tidak perlu
  tanya, tapi WAJIB didokumentasikan alasannya
- `DROP`/`TRUNCATE` schema production (Langkah 6) — ini destruktif terhadap Neon production;
  **konfirmasi dulu ke Aril sebelum eksekusi**, walau hasil akhirnya bisa dipulihkan dari `raw` —
  risikonya tinggi kalau ada asumsi salah di tengah jalan
- Kalau `gitleaks` menemukan sesuatu — laporkan ke Aril sebelum memutuskan cara menghapusnya dari
  histori git (rewrite history perlu izin eksplisit, aksi destruktif/ireversibel di repo publik)
- Kalau ditemukan bug lain sekelas Bug 1/Bug 2 (checkbox `BUILD_PLAN.md` bilang selesai tapi kode
  sebenarnya tidak melakukannya) — perbaiki di sumbernya, tambah regression test, laporkan jujur di
  `PROGRESS.md` persis seperti pola Bug 1/Bug 2 di sesi ini, jangan diam-diam dibiarkan

## ▲ SALIN SAMPAI SINI ▲

</details>

---

<details>
<summary><b>Arsip — Prompt Sesi 5</b></summary>

# SESI 5 — Deploy Fly.io + Vercel (5.11b, 6.15) — **selesai, dikerjakan koordinator langsung
(pivot ke Vercel karena Aril tidak punya kartu kredit; lihat PROGRESS.md 2026-08-30)**

## ▼ SALIN MULAI DARI SINI ▼

Lanjutkan proyek **GALI** di `C:/Users/Aril Indra Permana/Sectors_App`
(repo: https://github.com/mocharil/gali).

### Baca dulu, wajib

1. `PROGRESS.md`, dua entri teratas ("Task 0.8b: Redis TCP password ditemukan" dan entri Playwright e2e)
2. `BUILD_PLAN.md`, task **0.8a**, **0.8b** (keduanya sudah selesai), **5.11b**, **6.15**
3. `.env.production` di root repo — **jangan pernah commit, print isinya ke log, atau ke PR**

### Konteks

Neon (Postgres) dan Upstash (Redis) **keduanya sudah terprovisi penuh dan terverifikasi hidup**:
migrasi Alembic sukses, data lokal disalin 100% cocok, dan API sudah dijalankan sungguhan dengan
`DATABASE_URL`→Neon + `REDIS_URL`→Upstash sekaligus — `/ready` sehat, cache key dikonfirmasi benar-benar
tersimpan di Upstash lewat query langsung, dan zero-shock invariant Scenario Studio tetap benar
terhadap seluruh stack production. Playwright e2e juga sudah ada dan lolos (4/4) terhadap stack lokal.

**Yang belum ada di mesin ini: CLI `flyctl` dan `vercel` belum terpasang sama sekali.** Belum pernah
dicoba `fly auth login` atau `vercel login`.

### Langkah 1 — Pasang CLI (boleh dikerjakan otomatis, ini instalasi tool biasa)

```bash
# flyctl (Windows/Git Bash)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
# vercel CLI (lewat pnpm yang sudah ada)
pnpm add -g vercel
```

Verifikasi keduanya: `flyctl version`, `vercel --version`.

### Langkah 2 — STOP, minta Aril login

**Instalasi CLI boleh otomatis, tapi login TIDAK.** `fly auth login` dan `vercel login` membuka OAuth
browser flow ke akun pihak ketiga milik Aril — ini bukan aksi yang boleh agent lakukan sendiri (sama
seperti aturan pembuatan akun Neon/Upstash sebelumnya). Setelah CLI terpasang:

1. Minta Aril jalankan `flyctl auth login` dan `vercel login` sendiri di terminal (masing-masing
   ~30 detik, browser OAuth)
2. **Tunggu konfirmasi eksplisit dari Aril** bahwa keduanya sudah login sebelum lanjut ke Langkah 3
3. Verifikasi dengan `flyctl auth whoami` dan `vercel whoami` — jangan asumsikan login berhasil hanya
   karena Aril bilang "sudah", cek nyata

### Langkah 3 — Deploy API ke Fly.io (task 5.11b)

`infra/Dockerfile.api` dan `infra/fly.api.toml` sudah ada dari Fase 5 (artefak siap pakai, belum pernah
dipakai deploy sungguhan). Sebelum deploy:

1. Cek `infra/fly.api.toml` — pastikan nama app, region (Singapore/`sin` kalau tersedia, dekat dengan
   Neon), dan port cocok dengan `Dockerfile.api`
2. `fly launch` atau `fly apps create` sesuai nama di `fly.api.toml` (jangan buat app baru kalau nama
   sudah dipakai — cek `fly apps list` dulu)
3. Set secrets dari `.env.production` **satu per satu via `fly secrets set`, jangan pernah `cat
   .env.production` ke terminal log yang tersimpan**:
   ```bash
   fly secrets set DATABASE_URL="..." DATABASE_URL_SYNC="..." REDIS_URL="..." \
     SECTORS_API_KEY="..." --app <nama-app>
   ```
4. `fly deploy -c infra/fly.api.toml`
5. **Verifikasi hidup dari URL publik** (`https://<nama-app>.fly.dev`, bukan localhost):
   `/health`, `/ready` (harus `database:true, redis:true`), `GET /v1/issuers/ADRO`, dan
   `POST /v1/scenario` body kosong (harus delta 0.0% persis — ulangi pengujian yang sudah dilakukan
   lokal terhadap Neon+Upstash, sekarang lewat internet publik sungguhan)
6. Centang 5.11b di `BUILD_PLAN.md` **hanya setelah** langkah 5 nyata terjadi, bukan setelah `fly
   deploy` selesai tanpa error — belum tentu itu artinya aplikasi benar-benar bisa diakses dan benar

### Langkah 4 — Deploy Web ke Vercel (task 6.15)

1. Update `.env.production`: `NEXT_PUBLIC_API_BASE_URL` diarahkan ke URL Fly.io yang baru live dari
   Langkah 3 (ganti placeholder `https://gali-api.fly.dev`)
2. Deploy `packages/web` ke Vercel — root directory project di Vercel harus diset ke `packages/web`
   (monorepo, bukan root repo)
3. Set env var yang sama (`NEXT_PUBLIC_API_BASE_URL`) di dashboard/CLI Vercel
4. Setelah domain Vercel yang sebenarnya diketahui, update `CORS_ALLOW_ORIGINS` di `fly secrets` API
   (ganti placeholder `https://gali.vercel.app` di `.env.production` kalau domain asli berbeda), lalu
   `fly deploy` ulang API supaya CORS benar
5. **Verifikasi hidup dari domain Vercel publik**: buka di browser, cek `/`, `/map`, `/issuer/ADRO`,
   dan `/scenario` — jalankan skenario sungguhan, cek network tab bahwa request benar-benar ke
   `<nama-app>.fly.dev`, bukan localhost atau gagal karena CORS

### Definisi selesai sesi ini

1. `flyctl`/`vercel` CLI terpasang, Aril sudah login (diverifikasi via `whoami`, bukan diasumsikan)
2. API live di Fly.io, **diverifikasi dari URL publik** dengan urutan tes yang sama seperti yang
   sudah dilakukan berkali-kali sepanjang proyek ini terhadap localhost — jangan lewati verifikasi
   hanya karena sudah pernah dites secara lokal
3. Web live di Vercel, **diverifikasi dari domain publik**, termasuk bahwa ia benar-benar memanggil
   API Fly.io (bukan API lokal yang kebetulan masih jalan di mesin dev)
4. CORS benar (domain Vercel asli ada di `CORS_ALLOW_ORIGINS` API)
5. `BUILD_PLAN.md` dan `PROGRESS.md` diupdate jujur sesuai apa yang benar-benar diverifikasi publik
6. Commit + push, CI hijau

### Kapan berhenti dan bertanya

- CLI login (Langkah 2) — **selalu berhenti**, tidak ada pengecualian
- Kalau nama app Fly.io sudah dipakai orang lain (nama global unik) — tanya Aril nama alternatif,
  jangan menimpa/menebak
- Kalau CORS/domain Vercel butuh keputusan (custom domain vs `*.vercel.app` default) — tanya Aril
- Kalau menemukan bug sekelas bug scenario engine (dua bagian sistem menghitung hal yang sama dengan
  cara berbeda) saat verifikasi publik — perbaiki di sumbernya, tambah regression test, laporkan

## ▲ SALIN SAMPAI SINI ▲

</details>

---

<details>
<summary><b>Arsip — Prompt Sesi 4</b></summary>

# SESI 4 — Selesaikan Redis, lalu Deploy (5.11b, 6.14, 6.15)

## ▼ SALIN MULAI DARI SINI ▼

Lanjutkan proyek **GALI** di `C:/Users/Aril Indra Permana/Sectors_App`
(repo: https://github.com/mocharil/gali).

### Baca dulu, wajib

1. `PROGRESS.md`, entri "Task 0.8: Provisioning Neon + Upstash (koordinator)"
2. `BUILD_PLAN.md`, task **0.8a** (selesai) dan **0.8b** (terblokir)
3. File `.env.production` di root repo (jangan pernah commit ini)

### Konteks

Neon Postgres sudah diprovisi penuh dan **terverifikasi hidup**: migrasi Alembic sukses, seluruh data
lokal disalin ke sana (0 kredit, row count cocok 100%), dan API sudah dijalankan sungguhan terhadap
Neon — `/ready`, `/v1/issuers/ADRO`, `POST /v1/scenario` (zero-shock invariant tetap benar),
`/v1/coverage` semua mengembalikan data identik dengan lokal.

Upstash Redis databasenya sudah dibuat, tapi `REDIS_URL` di `.env.production` masih placeholder
`REPLACE_WITH_TCP_PASSWORD` — password TCP-nya tidak bisa diambil lewat otomasi browser (Upstash
tidak pernah menampilkan token sebagai teks biasa, cuma tombol copy; pembacaan clipboard/`data:`/
`file:` URL sengaja diblokir ekstensi — **jangan coba akali ini**). Aril diminta menyalinnya manual
dari tombol copy pada baris `redis-cli --tls -u redis://...` di dashboard Upstash (tab Details database
`gali`).

### Langkah 1 — Cek apakah `REDIS_URL` sudah terisi

```bash
grep '^REDIS_URL=' .env.production
```

**Kalau masih `REPLACE_WITH_TCP_PASSWORD`**: jangan blokir seluruh sesi karena ini. Kerjakan task
6.14 (Playwright e2e, lihat Langkah 2) dan siapkan konfigurasi deploy (Langkah 3) sambil menunggu.
Jangan mencoba mengambil password itu sendiri dengan cara lain — kalau Aril belum kasih, tanya lagi
di akhir sesi, jangan tebak atau kosongkan diam-diam.

**Kalau sudah terisi**: verifikasi hidup sebelum lanjut — boot API dengan `REDIS_URL` dari
`.env.production`, cek `/ready` (harus `"redis": true`), lalu cek Redis benar-benar dipakai (mis.
panggil satu endpoint dua kali, response kedua harus dari cache — bisa dicek lewat waktu respons atau
log). Jangan asumsikan config benar hanya karena tidak error saat boot.

### Langkah 2 — Playwright e2e (task 6.14)

Belum ada infrastruktur e2e sama sekali. Setup dari nol:
- `pnpm add -D @playwright/test` di `packages/web`
- Skenario minimum yang WAJIB ada (sesuai spec asli §6.14 + apa yang sudah diverifikasi manual sesi
  lalu, sekarang otomatiskan):
  1. Home (`/`) → render leaderboard nyata dari API
  2. Klik salah satu emiten → `/issuer/[symbol]` → metrik headline tampil (bukan skeleton selamanya)
  3. `/scenario` → isi body kosong secara efektif (default semua nol) → jalankan → **assert delta 0.0%
     persis untuk semua emiten LENGKAP** (ini regression test paling penting di seluruh proyek — bug
     task 5.12 pernah lolos ke production sebelum ketahuan manual, jangan sampai lolos lagi tanpa test)
  4. `/coverage` → assert angka 7/9 (atau apa pun yang live saat itu) ter-render, bukan placeholder
- Jalankan terhadap API lokal (docker postgres+redis, bukan Neon — e2e tidak perlu network eksternal)
- Tambahkan script `test:e2e` di `package.json`, dan masukkan ke CI (`.github/workflows/ci.yml`) kalau
  waktu memungkinkan — kalau tidak sempat, minimal pastikan jalan bersih secara lokal dan didokumentasikan
  cara menjalankannya di README

### Langkah 3 — Deploy API ke Fly.io (task 5.11b)

`infra/Dockerfile.api` dan `infra/fly.api.toml` sudah ada dari Fase 5 (artefak, belum pernah dipakai
deploy sungguhan). Sebelum deploy:
- Cek `flyctl` terpasang (`fly version`); kalau tidak ada, **minta Aril install & `fly auth login`**
  sendiri (autentikasi ke pihak ketiga, bukan sesuatu yang boleh agent lakukan atas nama user)
- Set secrets Fly.io dari `.env.production` (JANGAN commit file itu, JANGAN print isinya ke log/PR):
  `fly secrets set DATABASE_URL=... DATABASE_URL_SYNC=... REDIS_URL=... SECTORS_API_KEY=... --app <nama-app>`
- Deploy, lalu **verifikasi hidup dari URL publik** (bukan localhost): `/health`, `/ready`,
  `/v1/issuers/ADRO`, dan `POST /v1/scenario` zero-shock invariant — ulangi verifikasi yang sudah
  dilakukan terhadap Neon secara lokal, tapi sekarang lewat internet publik
- Update task 5.11b di `BUILD_PLAN.md` jadi selesai HANYA setelah verifikasi publik ini nyata terjadi

### Langkah 4 — Deploy Web ke Vercel (task 6.15)

- `NEXT_PUBLIC_API_BASE_URL` di `.env.production` arahkan ke URL Fly.io yang baru live dari Langkah 3
- Deploy `packages/web` ke Vercel (root directory `packages/web` di project settings Vercel)
- Set env var yang sama di dashboard Vercel
- Verifikasi CORS: `CORS_ALLOW_ORIGINS` di API harus memuat domain Vercel yang sebenarnya (ganti dari
  placeholder `https://gali.vercel.app` di `.env.production` kalau domain asli berbeda), lalu redeploy
  API kalau perlu
- **Verifikasi hidup dari URL publik**: buka domain Vercel di browser, cek `/`, `/map`, `/issuer/ADRO`,
  `/scenario` (jalankan skenario sungguhan, cek network tab bahwa request benar-benar ke Fly.io API,
  bukan localhost)

### Definisi selesai sesi ini

1. `REDIS_URL` terisi dan terverifikasi (atau jelas didokumentasikan masih menunggu Aril)
2. Playwright e2e ada, mencakup minimal 4 skenario di atas, lolos lokal
3. **Kalau Redis sudah beres**: API live di Fly.io, Web live di Vercel, keduanya diverifikasi dari
   URL publik dengan cara yang sama seperti verifikasi lokal sepanjang proyek ini — jangan anggap
   selesai hanya karena `fly deploy`/`vercel deploy` tidak error
4. `BUILD_PLAN.md` dan `PROGRESS.md` diupdate jujur — kalau sesuatu belum benar-benar diverifikasi
   publik, jangan dicentang selesai
5. Commit + push, CI hijau

### Kapan berhenti dan bertanya

- Kalau `REDIS_URL` masih placeholder di akhir sesi — laporkan, jangan deploy API dengan Redis rusak
  tanpa bilang eksplisit ke Aril bahwa caching/rate-limit tidak berfungsi.
- Kalau `flyctl`/`vercel` CLI butuh login pihak ketiga — minta Aril, jangan coba OAuth otomatis.
- Kalau menemukan bug sekelas bug scenario engine (dua bagian sistem menghitung hal yang sama dengan
  cara berbeda) — perbaiki di sumbernya, tambah regression test, laporkan sebagai temuan.

## ▲ SALIN SAMPAI SINI ▲

---

<details>
<summary><b>Arsip — Prompt Sesi 3</b></summary>

# Prompt untuk Agent Pelaksana

> **Sesi 3 ada di bawah ini.** Sesi 1 dan 2 diarsipkan di bagian bawah file.
> Selalu paste blok sesi terbaru.

---

# SESI 3 — Koreksi Gate + Fix GPS (task 3.10–3.12), lalu Fase 4

## ▼ SALIN MULAI DARI SINI ▼

Lanjutkan proyek **GALI** di `C:/Users/Aril Indra Permana/Sectors_App`
(repo: https://github.com/mocharil/gali).

### Baca dulu, wajib

1. `PROGRESS.md`, entri paling atas: **"Review Koordinator & Keputusan Gate Resmi"**
2. `BUILD_PLAN.md`, Fase 1, blok **"KEPUTUSAN RESMI (2026-08-29, dikonfirmasi Aril)"**
3. `BUILD_PLAN.md`, Fase 3, blok **"Koreksi wajib sebelum Fase 4"** (task 3.10–3.12)

### Konteks — baca ini dengan serius

Fase 0–3 sudah menghasilkan banyak kerja bagus: 30 test lolos, CI hijau, ownership graph teruji
sampai ke kasus Adaro yang cocok persis dokumentasi resmi. Tapi review independen menemukan **satu
pelanggaran proses yang serius**: hasil audit Fase 1 sendiri bilang `NO_GO` dengan instruksi STOP,
tapi sesi kerja berikutnya menulis "keputusan gate dilaporkan ke Aril" dan langsung lanjut ke Fase
2–3 dengan universe yang direlaksasi sepihak — **padahal konfirmasi itu tidak pernah benar-benar
terjadi.**

Ini sudah diselesaikan. Aril sudah memberi keputusan final (lihat `BUILD_PLAN.md` Fase 1), dan
substansi kerja Fase 2–3 tetap dipakai. **Tapi pelajari pola ini:** kalau kamu menulis "menunggu
konfirmasi X" di `PROGRESS.md`, itu janji untuk benar-benar berhenti. Jangan menulis kalimat itu lalu
di sesi berikutnya bertindak seolah sudah dijawab. Kalau ragu apakah sesuatu sudah disetujui,
anggap belum.

### Tugasmu sesi ini, berurutan

**Langkah 1 — task 3.10: backfill GPS situs tambang (57 kredit).**
Panggil endpoint detail `/v2/mining/sites/{slug}/` (wrapper `mining_site_detail` sudah ada di
`gali_core/sectors/endpoints.py`) untuk **57 situs** yang terhubung ke 9 emiten in-universe via
`graph.issuer_mining_link`. Query untuk dapatkan daftar slug-nya:

```sql
select distinct s.slug
from core.mining_site s
join graph.issuer_mining_link l on l.company_slug = s.company_slug
where l.symbol in ('AADI','ADMR','ADRO','BUMI','BYAN','GEMS','ITMG','PTBA','DSSA');
```

Buat/lengkapi Dagster asset untuk endpoint ini kalau belum ada, jalankan hanya untuk 57 slug ini
(**jangan** all 156 situs — di luar scope in-universe, buang-buang kredit). Setelah selesai,
verifikasi: `core.mining_site.latitude`/`longitude` terisi untuk situs-situs itu.

**Langkah 2 — task 3.11: update `docs/DATA_COVERAGE.md`.**
Ganti baris "0 dengan koordinat GPS" dengan angka pasca-backfill. Tambahkan catatan singkat bahwa
keputusan gate final (9 emiten: 7 lengkap + 2 parsial) ditetapkan Aril pada 2026-08-29, dengan
rujukan ke blok "KEPUTUSAN RESMI" di `BUILD_PLAN.md`.

**Langkah 3 — task 3.12: entri `PROGRESS.md`.**
Satu entri ringkas: apa yang diperbaiki di 3.10–3.11, kredit yang terpakai backfill, dan konfirmasi
bahwa aturan tampilan PTBA/DSSA (field null tetap null, badge low-confidence, bobot M8 dinormalisasi
ulang) sudah kamu pahami dan akan diterapkan mulai Fase 4.

**Langkah 4 — centang 3.10, 3.11, 3.12 di `BUILD_PLAN.md`.**

**Langkah 5 — mulai Fase 4 (Metric Engines, task 4.1–4.14).**
Implementasikan M1–M9 persis sesuai rumus di `BUILD_PLAN.md` §4.1. Yang WAJIB diperhatikan mengingat
keputusan gate:

- **M1 (RLI)**: golden test Adaro tetap wajib — `819 / 48.11 = 17.02 tahun` (toleransi 0.05). Untuk
  **DSSA**, `total_reserves_Mt` null → RLI harus `NULL`, bukan dilewati diam-diam atau diisi 0.
  Pastikan ada test eksplisit yang menegaskan ini.
- **M2 (RBV)**: bergantung pada M1 dan `attributable_gross_profit`. Untuk **PTBA** (revenue/cost
  null) dan **DSSA** (RLI null) → RBV harus `NULL` untuk keduanya. Test eksplisit untuk kedua kasus.
- **M4 (Cash Cost)**: untuk **PTBA** → `NULL` (revenue/cost null). PTBA tetap boleh muncul di kurva
  biaya nasional untuk emiten lain, tapi titik PTBA sendiri tidak ada di kurva karena datanya kosong.
- **M8 (Ground Truth Score)**: ini sudah didesain untuk kasus ini di spec (§4.1 M8: "komponen yang
  datanya null di-drop dan bobotnya dinormalisasi ulang"). Terapkan persis itu untuk PTBA dan DSSA,
  dan pastikan `confidence` di `metrics.issuer_metrics` mencatat bobot efektif yang benar-benar
  dipakai — bukan asumsi bobot penuh.
- **Evidence (4.10)**: untuk field yang null, `evidence` tetap harus ada dan secara eksplisit
  menyatakan field mana yang kosong dan kenapa (mis. `"total_reserves_Mt": null, "reason": "not
  reported by Sectors mining/companies/performance endpoint"`) — bukan `evidence` kosong.

### Definisi selesai untuk sesi ini

1. 3.10–3.12 dicentang, GPS terisi untuk 57 situs, `docs/DATA_COVERAGE.md` ter-update
2. Fase 4 berjalan sejauh yang bisa diselesaikan dalam sesi ini; task yang belum selesai dibiarkan
   tidak tercentang dengan jujur
3. Test baru untuk kasus null PTBA/DSSA di M1/M2/M4 hijau
4. `ruff check` dan `mypy` bersih
5. Commit + push; CI hijau
6. `PROGRESS.md` diupdate

### Kapan berhenti dan bertanya (tegas kali ini)

Kalau kamu menemukan ambiguitas lain yang levelnya sama seperti temuan gate di atas — sesuatu yang
kalau salah arah akan sia-siakan banyak kerja berikutnya — **berhenti sungguhan**. Tulis pertanyaannya
di `PROGRESS.md` bagian "Blocker", commit, lalu selesai untuk sesi ini. Jangan menebak jawabannya dan
melanjutkan.

## ▲ SALIN SAMPAI SINI ▲

---

<details>
<summary><b>Arsip — Prompt Sesi 2</b></summary>

# Prompt untuk Agent Pelaksana

> **Sesi 2 ada di bawah ini.** Prompt kickoff Sesi 1 diarsipkan di bagian bawah file.
> Selalu paste blok sesi terbaru.

---

# SESI 2 — Hardening Akuntansi Kredit (task 0.14–0.17)

## ▼ SALIN MULAI DARI SINI ▼

Lanjutkan proyek **GALI** di `C:/Users/Aril Indra Permana/Sectors_App`
(repo: https://github.com/mocharil/gali).

### Konteks

Fase 0 sudah hampir selesai dan **sudah diverifikasi independen**: task 0.5, 0.6, 0.7, 0.9, 0.10,
0.12, 0.13 tuntas, 14 test lolos, CI hijau, repo publik bersih tanpa secret di history. Kerja bagus.

Review menemukan **tiga celah di akuntansi kredit** yang harus ditutup sebelum Fase 1, karena Fase 1
justru fase yang paling banyak memicu kondisi-kondisi ini. Task 0.14–0.17 sudah ditambahkan ke
`BUILD_PLAN.md` (Fase 0, tepat setelah task 0.13). **Baca bagian itu dulu**, lalu kerjakan.

### Tugasmu sesi ini: HANYA task 0.14–0.17

**Jangan mulai Fase 1.** Exit Criteria Fase 0 belum terpenuhi — `raw.responses` masih 0 baris karena
`SECTORS_API_KEY` belum ada. Fase 1 baru boleh jalan setelah Aril mengisi `.env` dan `gali smoke`
(task 0.11) lolos.

Semua task sesi ini **tidak butuh API key** — semuanya diuji dengan mock (`respx`).

### Aturan billing resmi Sectors (rujukan)

| Respons | Ditagih? |
|---|---|
| 2xx | Ya — sesuai biaya endpoint |
| **404** | **Ya — 1 kredit** (request valid, lookup dijalankan, resource tidak ada) |
| 400 / 401 / 403 / 429 / 5xx | Tidak — gratis |
| Screener `?q=` sukses | 3 kredit |
| Screener `where`/`order_by` | 1 kredit |

### 0.14 — Tagih 1 kredit pada 404, dan jadikan 404 hasil kelas satu

Masalah: `_execute_http_request` memanggil `response.raise_for_status()`, sehingga 404 melempar
exception **sebelum** ledger ditulis. Kredit terpakai nyata tapi tidak tercatat → ledger undercount →
`CreditBudget` berhenti terlambat → pemakaian bisa melewati 950 tanpa terdeteksi.

Yang harus dilakukan:
1. Ganti `raise_for_status()` dengan penanganan status eksplisit.
2. Pada **404**: persist baris `raw.responses` dengan `status_code=404` (payload boleh body respons
   atau `null`) sebagai jejak audit, catat `ops.credit_ledger` sebesar **tepat 1** — bukan
   `credit_cost` endpoint — lalu lempar exception bertipe khusus, mis. `SectorsNotFoundError`.
3. Pada **400 / 401 / 403 / 5xx**: lempar exception, **jangan** catat kredit.

**Poin desain yang penting:** di Fase 1, 404 bukan kegagalan — itu **temuan coverage**
("perusahaan ini tidak punya data performance"). Audit harus bisa menangkapnya dengan bersih lalu
melanjutkan loop, bukan berhenti. Karena itu 404 wajib punya tipe exception sendiri, terpisah dari
error jaringan.

### 0.15 — Retry pada 429

`429` gratis menurut aturan billing, tapi saat ini melempar `HTTPStatusError` yang tidak masuk daftar
retry — satu rate-limit di tengah run membatalkan seluruh proses. Fase 1 melakukan **139 panggilan
paginasi beruntun** untuk lisensi; ini persis skenario pemicunya.

Tambahkan retry khusus `429` dengan exponential backoff, hormati header `Retry-After` bila ada,
terpisah dari retry `TransportError`/`TimeoutException` yang sudah ada. Percobaan yang gagal
**tidak boleh** mencatat kredit.

### 0.16 — Pisahkan biaya screener

`ENDPOINTS` memberi semua screener `credit_cost=1`. Screener natural-language (`?q=`) sebenarnya
**3 kredit**. Rencana §5 memakai `where` terstruktur, jadi risikonya rendah — tapi daftarkan sebagai
dua entri terpisah (`companies_screener_structured` = 1, `companies_screener_nl` = 3) supaya ledger
tidak pernah salah kalau `?q=` dipakai belakangan.

### 0.17 — Test

Tambahkan unit test dengan `respx`:
- 404 → tercatat **tepat 1** kredit, ada baris `raw.responses` dengan `status_code=404`, dan
  `SectorsNotFoundError` terlempar
- 404 pada endpoint ber-`credit_cost=3` (`company_report`) → tetap tercatat **1**, bukan 3
- 429 lalu 200 → di-retry, sukses, dan hanya **satu** entri kredit tercatat
- 400 dan 500 → **tidak ada** entri kredit sama sekali
- Regression: cache tetap hanya menyajikan `status_code == 200` (perilaku ini sudah benar, jaga
  jangan sampai rusak oleh perubahan di 0.14)

### Definisi selesai

1. `./.venv/Scripts/python.exe -m pytest packages/core/tests -q` hijau, jumlah test bertambah
2. `ruff check` dan `mypy` bersih
3. Checkbox 0.14–0.17 dicentang di `BUILD_PLAN.md`
4. Entri baru di `PROGRESS.md` sesuai format yang sudah ada
5. Commit + push ke `main`; verifikasi CI hijau dengan `gh run list --repo Mocharil/gali`

### Setelah selesai

Lapor hasilnya, lalu **berhenti**. Jangan lanjut ke Fase 1.

Kalau saat kamu bekerja file `.env` ternyata sudah ada dan `SECTORS_API_KEY` terisi, kamu boleh
menjalankan `gali smoke` untuk menutup task 0.11 (biaya 1 kredit) — verifikasi `raw.responses` dan
`ops.credit_ledger` masing-masing bertambah satu baris. Kalau `.env` belum ada, lewati dan laporkan
bahwa 0.11 masih terblokir.

## ▲ SALIN SAMPAI SINI ▲

---

</details>

</details>

<details>
<summary><b>Arsip — Prompt Kickoff Sesi 1</b></summary>


Paste blok di bawah ini **apa adanya** ke agent yang akan mengeksekusi build GALI.
Blok ini sengaja self-contained: agent yang belum tahu apa-apa soal proyek ini pun harus
bisa langsung bekerja setelah membacanya.

---

## ▼ SALIN MULAI DARI SINI ▼

Kamu adalah engineer pelaksana untuk proyek **GALI**, entri Sectors Hackathon 2026.
Working directory: `C:\Users\Aril Indra Permana\Sectors_App`

### 1. Sumber kebenaran

**Baca `BUILD_PLAN.md` di root repo secara utuh sebelum menyentuh apa pun.** File itu adalah
satu-satunya spesifikasi: arsitektur, data model, rumus metrik, API surface, 10 fase build dengan
~110 task bercentang, anggaran kredit, dan kriteria verifikasi. Jangan bekerja dari ingatan atau
asumsi — kalau sesuatu tidak ada di `BUILD_PLAN.md`, itu bukan bagian dari scope.

Perhatikan khusus:
- **§0** — aturan kerja yang mengikat kamu
- **Fase 0 → blok "⚠️ BACA DULU — KEADAAN REPO SAAT INI"** — apa yang sudah jadi, jangan diulang
- **§5** — anggaran kredit API. Ini kendala paling keras di proyek ini.
- **§4.1** — rumus metrik. Implementasikan persis, jangan diimprovisasi.

### 2. Apa yang sedang dibangun (ringkas)

GALI menilai emiten komoditas IDX dari **tambang fisiknya**, bukan dari grafik harganya: berapa ton
cadangan tersisa, berapa tahun lagi habis, berapa cash cost per ton, izin ESDM mana yang kedaluwarsa,
dan ke negara mana hasilnya dijual — lalu membandingkannya dengan yang sedang dihargai pasar.

Sumber data: **Sectors Financial API**, terutama ekstensi Mining (`/v2/mining/*`) yang hampir tidak
dipakai peserta lain. Arsitektur: Dagster → Postgres → FastAPI → Next.js. Semua live, tidak ada
data statis yang di-hardcode.

### 3. Protokol kerja — wajib

1. **Kerjakan fase berurutan.** Dilarang mulai Fase N+1 sebelum seluruh *Exit Criteria* Fase N
   terpenuhi dan terverifikasi dengan perintah nyata (bukan keyakinan).
2. **Fase 1 adalah HARD GATE.** Dilarang menulis kode produk (metrik, API, UI) sebelum audit
   kelengkapan data lulus. Kalau hasil audit NO-GO (<8 emiten layak), **BERHENTI dan lapor ke Aril.**
   Jangan diam-diam pivot ke ide lain.
3. **Centang checkbox di `BUILD_PLAN.md` secara in-place** (`- [ ]` → `- [x]`) hanya setelah task
   selesai **dan terverifikasi**. Jangan mencentang berdasarkan niat atau "seharusnya jalan".
4. **Update `PROGRESS.md` setiap sesi kerja**, format persis seperti yang sudah ada di file itu.
5. **Laporkan pemakaian kredit** di setiap entri `PROGRESS.md`. Jalankan `gali credits report`
   setelah setiap ingest run.
6. **Jangan menambah scope.** Kalau kamu yakin ada yang perlu ditambah, tulis alasannya di
   `PROGRESS.md` bagian "Keputusan" dan tanyakan ke Aril dulu.
7. **Setiap angka yang tampil di UI wajib punya provenance** ke `raw.responses.id`. Metrik tanpa
   provenance = bug, bukan fitur yang belum sempat.
8. **Setiap asumsi finansial** hidup di `gali_core/config.py::Assumptions` — tidak boleh ada angka
   finansial yang di-hardcode di tempat lain.

### 4. Kendala keras yang tidak boleh dilanggar

**Kredit API — 1.000 total, tidak bisa ditambah.**
- `SectorsClient` **selalu** cek `raw.responses` dulu. Cache hit = 0 kredit.
- `GALI_DRY_RUN=1` adalah **mode default saat development**. Cache miss harus *raise*, bukan
  diam-diam memanggil API.
- Hard cap 950 di `CreditBudget`. Melampaui = raise `BudgetExceeded`, run gagal keras.
- Selalu `limit=30` (maksimum) di endpoint terpaginasi.
- Kalau ragu apakah sebuah panggilan perlu → **jangan panggil**, tanya dulu.

**Aturan kompetisi (dari hackathon.sectors.app/rules) — melanggar = diskualifikasi:**
- Repo publik, **tidak boleh ada API key ter-commit**. Jalankan `gitleaks` sebelum setiap push.
- First commit harus ≥ 19 Ags 2026 (hari ini 29 Ags, aman).
- **Dilarang ada jalur eksekusi trading otomatis** di seluruh codebase.
- **Wajib disclaimer** "bukan nasihat investasi" di footer web, README, dan `/methodology`.
- Sectors API wajib jadi sumber data inti.
- **Submit = freeze permanen.** Setelah submit, satu commit pun (termasuk bugfix) melanggar aturan.

### 5. Mulai dari mana

Environment sudah berjalan — **jangan setup ulang**:
- `gali-postgres` healthy di **host port 5433** (bukan 5432; 5432 dipakai container lain milik user)
- `gali-redis` healthy di 6379
- `.venv` dengan **Python 3.13.13**, ketiga paket ter-install editable
- `gali_core/config.py` dan `gali_core/db/{base,models}.py` sudah ada dan terverifikasi import

Task berikutnya, berurutan:
- **0.5** `git init` + **buat repo publik `Mocharil/gali` dan push.** Aril sudah menyetujui ini
  — kamu yang mengeksekusi, tidak perlu tanya lagi. Akun `mocharil` sudah terautentikasi via
  `gh` di mesin ini dan berstatus active. Perintah lengkapnya ada di `BUILD_PLAN.md` task 0.5.
  **Wajib sebelum push:** `gitleaks detect` bersih dan `.env` tidak ter-stage.
- **0.9** Alembic init + migrasi pertama untuk schema `raw` dan `ops`
- **0.10** `SectorsClient` v0 + `CreditBudget` + cache berjenjang
- **0.12** `.github/workflows/ci.yml`
- **0.13** seed `PROGRESS.md`
- **0.11** smoke test — **BLOKIR sampai Aril mengisi `SECTORS_API_KEY`**

Task **0.1–0.4 dan 0.8 hanya bisa dikerjakan Aril** (daftar tim, onboarding Sectors, klaim 1.000
kredit, generate API key, provision Neon + Upstash). Kalau `SECTORS_API_KEY` masih kosong: kerjakan
semua yang tidak butuh jaringan, lalu berhenti dan minta Aril. **Jangan pernah mengarang data dummy
untuk melewati sebuah gate** — seluruh nilai proyek ini ada pada angkanya yang benar.

### 6. Kapan harus berhenti dan bertanya

Berhenti dan lapor ke Aril kalau:
- Hasil Fase 1 = NO-GO (<8 emiten dengan data lengkap)
- Pemakaian kredit menyimpang >20% dari rencana §5
- Sebuah endpoint Sectors mengembalikan bentuk yang berbeda dari `BUILD_PLAN.md` §1
- Kamu merasa perlu mengubah scope, arsitektur, atau rumus metrik
- Ada keputusan yang butuh akun/kredensial Aril

Kalau macet di satu masalah teknis >45 menit, tulis apa yang sudah dicoba di `PROGRESS.md` lalu
tanya — jangan menghabiskan sesi pada satu blocker.

### 7. Definisi "selesai" untuk sebuah task

Sebuah task boleh dicentang kalau **ketiganya** benar:
1. Kode ada dan jalan
2. Ada perintah nyata yang membuktikannya (test hijau / query yang mengembalikan baris / endpoint
   yang merespons) — dan kamu sudah menjalankannya
3. Hasilnya tercatat di `PROGRESS.md`

"Sepertinya sudah jalan" bukan selesai.

## ▲ SALIN SAMPAI SINI ▲

---

## Catatan untuk Aril (jangan di-paste)

**Yang cuma bisa kamu kerjakan sendiri, dan sebaiknya hari ini** — karena semua fase teknis
tersandera di sini:

1. Daftar tim di `hackathon.sectors.app/portal/team` (solo = tim beranggota satu).
   Registrasi tutup **22 Sep**, tapi kreditnya dibutuhkan sejak hari pertama.
2. Buat akun di `sectors.app` dan **selesaikan onboarding sampai tuntas** — ini diverifikasi panitia,
   dan submission bisa dianggap tidak sah kalau belum kelar.
3. Klaim **1.000 API credits** lewat halaman tim di portal.
4. Generate API key → isi ke `.env` (copy dari `.env.example`). **Jangan commit file ini.**
5. Provision Neon (Postgres) + Upstash (Redis) untuk deployment produksi — bisa ditunda sampai
   Fase 5, karena development jalan di Docker lokal.

**Repo GitHub:** sudah diputuskan — `Mocharil/gali`, publik, dan **agent yang membuatnya**
(task 0.5). Kamu tidak perlu menyiapkan apa pun untuk ini.

Satu hal yang perlu kamu tahu: aturan hackathon mewajibkan repo **tetap publik minimal 90 hari**
setelah pengumuman pemenang (9 Okt 2026), jadi jangan di-private sampai sekitar awal Januari 2027.
Menjadikannya private sebelum itu menggugurkan hak hadiah.

</details>
