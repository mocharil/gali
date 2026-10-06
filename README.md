# GALI — Ground-truth Analytics for Listed Issuers

[![CI](https://github.com/mocharil/gali/actions/workflows/ci.yml/badge.svg)](https://github.com/mocharil/gali/actions/workflows/ci.yml)
[![Hot Refresh](https://github.com/mocharil/gali/actions/workflows/refresh.yml/badge.svg)](https://github.com/mocharil/gali/actions/workflows/refresh.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> *"Gali lebih dalam dari kode sahamnya."*

Proyek untuk **Sectors Hackathon 2026**, **Track 3 (Market Intelligence)**.

---

## 🌐 Live Production Deployments

- **Web Application**: [https://gali-web.vercel.app](https://gali-web.vercel.app)
- **REST API & Swagger Docs**: [https://gali-api.vercel.app/docs](https://gali-api.vercel.app/docs)
- **API Base URL**: [https://gali-api.vercel.app](https://gali-api.vercel.app)

---

## 💡 Apa itu GALI?

GALI menilai emiten komoditas Bursa Efek Indonesia (IDX) dari **aset fisik tambangnya**, bukan sekadar grafik harganya:
- Berapa juta ton cadangan batubara tersisa?
- Berapa tahun lagi cadangan habis pada laju produksi saat ini (**M1 Reserve Life Index**)?
- Berapa nilai model berbasis cadangan (**M2 Reserve-Backed Value**)?
- Izin ESDM (IUP/IUPK) mana yang akan kedaluwarsa dalam 1–5 tahun ke depan (**M3 License Cliff**)?
- Berapa estimasi cash cost per ton dan titik impas harga acuan (**M4 Cash Cost Curve**)?
- Berapa konsentrasi risiko pasar ekspor (**M6 Destination Stress Test**)?
- **Scenario Studio**: Simulasi interaktif pergeseran harga komoditas global dan pengurangan permintaan per negara dan asumsi masa berlaku izin terhadap RBV!

---

## 📊 Cakupan Data (Coal Titans Universe)

Universe dataset lokal mencakup 9 emiten batubara IDX:
- **7 Emiten Lengkap**: `AADI`, `ADMR`, `ADRO`, `BUMI`, `BYAN`, `GEMS`, `ITMG`
- **2 Emiten Parsial**: `DSSA`, `PTBA` (dilaporkan secara transparan dengan badge data parsial)

Kelengkapan di atas mengacu pada metrik utama, bukan seluruh pilar skor. Dataset lokal memiliki **6 emiten dengan skor lengkap**; `ADMR` juga memiliki skor sementara karena komponen risiko kontraktor belum tersedia. Skor sementara tetap dapat ditelusuri, tetapi tidak mendapat peringkat lengkap.

---

## Desain GALI

Versi 0.3 mengadaptasi panduan desain Organa: Plus Jakarta Sans lokal, permukaan putih, tipografi navy, aksen amber/cyan, sidebar 256 px, kartu 20 px, dan kontrol yang konsisten. Pedoman implementasi tersedia di [GALI Design System](docs/GALI_DESIGN_SYSTEM.md).

## AI response review: version 0.5.1

Eight response scenarios now cover comparisons, active stress and gross losses, partial data, provisional scores, dashboard resilience, unsupported live-market questions, and long-answer layouts. Method references have clear labels, scenario evidence links preserve their issuer and assumptions, mobile answers wrap cleanly, and saved briefs retain response status and finding categories. See [AI_OUTPUT_REVIEW.md](docs/AI_OUTPUT_REVIEW.md) for verified checks and live questions to evaluate with your service account.

## Gemini research: version 0.5.0

The Data Assistant now supports Gemini on Vertex AI with server-side service account JSON authentication, source-linked natural-language answers, follow-up research questions, and downloadable AI briefs. The dashboard and Scenario Studio can explain their deterministic calculations through Gemini research briefs. GALI validates evidence references and fills numeric placeholders from server facts; incomplete or unsupported model output is rejected.

Copy `packages/web/.env.local.example` to `packages/web/.env.local`, set `GOOGLE_APPLICATION_CREDENTIALS` to your private service account JSON's absolute path, and restart `npm run local`. Project billing, Vertex AI API access, and the service account's Vertex AI permissions are required. See [GEMINI_SETUP.md](docs/GEMINI_SETUP.md) for the Windows setup, configuration, analytical limits, and troubleshooting. Data analysis remains available without credentials. Live model access must be verified with your own service account.

## Visual interface: version 0.4.3

GALI now uses eleven coordinated illustrations across the landing page, dashboard, issuer profiles, comparison, cost curve, valuation, scenarios, coverage, methodology, and Data Assistant. Reserve, cost, and license hotspots explain the mine model; issuer selectors keep unit economics and valuation examples connected to the dataset.

The mining-site map remains geographic and interactive, using MapLibre, locally bundled Natural Earth country geometry, and coordinates from the active dataset. Zoom, pan, filters, site details, and a geographic fallback are available without a map token. Original PNG assets, optimized WebP assets, generation prompts, and a rebuild script are included. See [VISUAL_UI.md](docs/VISUAL_UI.md) and [MAP_SOURCES.md](docs/MAP_SOURCES.md).

## English interface: version 0.4.2

The entire app now uses English, including navigation, metric help, analytical summaries, assistant prompts and answers, map labels, data coverage, evidence, empty states, errors, research briefs, and CSV exports. Dates and numbers use the English (US) locale. The Data Assistant recognizes English research questions.

The GALI color palette and Plus Jakarta Sans typography are preserved. Human-readable source labels are translated on a presentation copy; source identifiers, API enums, missing values, and numeric metrics retain their original values. See [ENGLISH_UI.md](docs/ENGLISH_UI.md) for scope and verification.

## Penyempurnaan UI versi 0.4.1

- Dashboard menampilkan ringkasan, tiga uji tekanan, dan kartu emiten. Matriks lengkap, peta, dan penjelasan metode bisa dibuka sesuai kebutuhan.
- Profil emiten memakai tab Ringkasan, Valuasi, Operasi & izin, serta Skor & cakupan. Tombol cetak mencetak bagian yang sedang dibuka. Bantuan metrik dapat dibuka melalui tombol dan ditutup dengan Escape.
- Peta memakai kelompok wilayah pada tampilan nasional; pilih kelompok untuk melihat titik individual dan koordinat aslinya. Pencarian serta filter emiten/provinsi berlaku pada peta dan daftar lokasi.
- Navigasi, pencarian fitur, dan judul halaman berbagi daftar label yang sama. Kelengkapan metrik tetap dibedakan dari kelengkapan bobot skor.

Font Plus Jakarta Sans dan warna navy, amber, serta cyan tetap dipakai. Rumus, dataset, cakupan skor, dan format ekspor analitis tidak berubah. Rincian dan verifikasi tersedia di [UI_POLISH.md](docs/UI_POLISH.md).

## Analisis dan UI versi 0.4

- **Scenario Studio**: waterfall kontribusi harga, volume, izin dan diskonto; matriks sensitivitas; pendapatan, biaya, laba/rugi kotor serta titik impas harga; research brief yang dapat diunduh. Pilihan emiten dan asumsi tersimpan di URL.
- **Diagnostik skor**: cakupan bobot dan kontribusi lima pilar, pemisahan skor sementara, serta rentang skor/peringkat pada 11 konfigurasi bobot. Cakupan bobot bukan probabilitas ketepatan.
- **Konteks RBV**: annuitas laba kotor, cakupan finansial dan batas operator yang dimodelkan. RBV bukan free cash flow atau nilai wajar ekuitas; pendapatan dan biaya skenario hanya ditampilkan jika basisnya dapat direkonsiliasi.
- **Integritas model**: pasangan cadangan/produksi dan kepemilikan harus tersedia; laba kotor negatif tetap terlihat saat RBV dibatasi nol; gap pasar memakai label netral dan peer dengan skor lengkap.

Desain mempertahankan navy, amber dan cyan GALI dengan font lokal, tabel yang dapat diperiksa dan panel responsif. Hasil pengujian model tersedia di [RESEARCH_VERIFICATION.md](docs/RESEARCH_VERIFICATION.md). Pada versi 0.4, brief dan Asisten Data menggunakan aturan deterministik. Versi 0.5 menambahkan Gemini opsional; perhitungan serta mode Data analysis tetap deterministik.

## 🛠️ Quickstart

**Dashboard lokal tanpa token (Windows/macOS/Linux):** gunakan Node.js 20.9+, lalu jalankan dari root proyek:

```bash
npm run local
```

Pada Windows bisa juga klik dua kali `START_GALI.cmd`. Dependency frontend dipasang otomatis jika belum tersedia. Buka **http://localhost:3000**. Mode ini menggunakan dataset sintetis konsisten; dashboard, skenario, peta, dan CSV berjalan tanpa Python, Docker, atau API key setelah dependency terpasang. Lihat [panduan dataset lokal](docs/LOCAL_DATASET.md) untuk build, metode, dan alur presentasi.

Jika sudah berada di `packages/web`, jalankan `npm ci` lalu `npm run local`. Error `'next' is not recognized` berarti dependency frontend belum terpasang.

**Integrasi Sectors asli:**

Prasyarat: Python 3.11+, Node.js 20+, Docker Compose. Verifikasi audit lokal menggunakan Python 3.12 dan Node 24. Aktifkan virtual environment pada setiap terminal Python.

```bash
git clone https://github.com/mocharil/gali.git
cd gali
python -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -e "packages/core[dev]" -e "packages/api[dev]" -e "packages/pipeline[dev]"
docker compose up -d postgres redis
cp .env.example .env
alembic -c packages/core/alembic.ini upgrade head
```

Database kosong belum menghasilkan dashboard. ZIP tidak berisi cache Sectors atau credential. `GALI_DRY_RUN=1` hanya membaca cache yang telah ada; bukan seed data atau mode demo palsu.

**Dataset Sectors:** masukkan `SECTORS_API_KEY` server-side dan set `GALI_DRY_RUN=0` untuk audit upstream yang menggunakan kredit. Periksa `gali credits report` dan batas budget sebelum menjalankannya. Setelah respons tersimpan, ubah kembali `GALI_DRY_RUN=1` untuk membaca cache tanpa kredit baru.

```bash
gali audit run --max-credits 200
gali ingest --tier all
gali graph resolve
gali graph backfill-licenses
gali sites backfill-gps
gali metrics run
gali coverage
```

Cakupan audit dapat memerlukan pengambilan warm/hot tambahan melalui pipeline untuk seluruh universe. Periksa hasil Coverage; jangan menganggap setiap cache audit berisi data lengkap. `gali sites backfill-gps` membutuhkan cache detail atau mode live yang menggunakan kredit. Jalankan `--help` untuk parameter setiap perintah.

```bash
# Terminal API (virtual environment aktif)
uvicorn gali_api.main:app --host 127.0.0.1 --port 8000
# Terminal frontend
cd packages/web
npm ci
npm run dev
```

Buka http://localhost:3000. Proxy `/api` mengarah ke `API_URL` (default http://127.0.0.1:8000); `NEXT_PUBLIC_API_BASE_URL` tetap didukung. Kunci Sectors tidak pernah dimasukkan ke frontend. `/health` adalah liveness; `/ready` membutuhkan database dan published metrics.

## Pengujian

Gunakan database terpisah yang kosong, dengan `ENVIRONMENT=test`, `GALI_QA_FIXTURES=1`, `GALI_DRY_RUN=1`, dan URL database/Redis pengujian. Fixture sintetis hanya dibuat oleh perintah eksplisit dan diberi nama **QA fixture**; jangan digunakan sebagai bukti data Sectors pada demo.

```bash
alembic -c packages/core/alembic.ini upgrade head
pytest packages/core/tests packages/api/tests packages/pipeline/tests -v
ruff check .
ruff format --check .
mypy packages/core/gali_core
```

Untuk E2E, seed database pengujian dan aktifkan virtual environment sebelum Playwright menjalankan server:

```bash
python scripts/seed_test_database.py
cd packages/web
npm ci
npm run gen:api
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

`PLAYWRIGHT_EXTERNAL_SERVERS=1` menggunakan server yang sudah dijalankan. `PLAYWRIGHT_USE_DEV=1` memilih dev server. Hasil tes dan fixture bukan data yang disajikan secara otomatis ketika API produksi gagal.

Mode Data analysis dan ringkasan perbandingan menggunakan aturan deterministik pada fakta API. Mode Gemini analysis dan AI research brief memakai Gemini melalui Vertex AI jika kredensial server tersedia. Kegagalan koneksi tidak diganti dengan respons AI tiruan. Insight numerik utama tetap dihitung oleh GALI: RLI, RBV, biaya, risiko izin, skor, dan sensitivitas.

---

## 📚 Dokumentasi Proyek

| Dokumen | Deskripsi |
|---|---|
| [`docs/LOCAL_DATASET.md`](docs/LOCAL_DATASET.md) | Dashboard tanpa token, dataset sintetis, stress test, dan launcher Windows |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Desain teknis arsitektur monorepo, schema Postgres, keamanan, dan load test |
| [`docs/METRICS.md`](docs/METRICS.md) | Rumus matematis dan metodologi perhitungan M1–M9 |
| [`docs/CREDIT_BUDGET.md`](docs/CREDIT_BUDGET.md) | Metodologi budget kredit; angka aktual tersedia di Coverage |
| [`docs/DATA_COVERAGE.md`](docs/DATA_COVERAGE.md) | Laporan kelayakan data Coal Titans dan transparansi cakupan |
| [`BUILD_PLAN.md`](BUILD_PLAN.md) | Rencana pengembangan dan status verifikasi seluruh fase |
| [`PROGRESS.md`](PROGRESS.md) | Catatan log pengerjaan per sesi |

---

## 🔒 Keamanan & Audit

- **CORS Lockdown**: Origin dibatasi ketat ke domain resmi frontend.
- **Rate Limiting**: Sliding-window counter berbasis Redis untuk IP publik. Jika Redis tidak tersedia, limiter fail-open. Header API key yang belum diverifikasi tidak memberi kuota tambahan. `TRUST_PROXY_HEADERS=1` hanya untuk proxy yang menimpa header dari klien.
- **Secret hygiene**: tidak memasukkan `.env` atau kunci ke frontend; lakukan pemeriksaan credential lagi pada commit final.

---

Lihat [naskah demo](docs/JUDGING_SCRIPT.md) dan [laporan audit](docs/DEMO_AUDIT.md) untuk hasil verifikasi serta pekerjaan yang tersisa. Angka cakupan historis bukan jaminan kondisi dataset berikutnya.

## ⚖️ Disclaimer

GALI adalah **alat informasi dan analisis data publik**, bukan nasihat investasi atau keuangan. Tidak ada rekomendasi beli/jual yang diberikan, dan tidak ada fungsi eksekusi perdagangan dalam bentuk apa pun. Seluruh angka turunan bergantung pada kelengkapan data sumber; lihat halaman `/coverage` untuk cakupan data yang sebenarnya. Lakukan riset mandiri sebelum mengambil keputusan finansial.

---

## 📜 Lisensi

Didistribusikan di bawah lisensi [MIT](LICENSE).
