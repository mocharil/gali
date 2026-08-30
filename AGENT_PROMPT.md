# Prompt untuk Agent Pelaksana

> **Sesi 4 ada di bawah ini.** Sesi 1-3 diarsipkan di bagian bawah file.
> Selalu paste blok sesi terbaru.

---

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
