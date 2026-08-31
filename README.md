# GALI — Ground-truth Analytics for Listed Issuers

[![CI](https://github.com/mocharil/gali/actions/workflows/ci.yml/badge.svg)](https://github.com/mocharil/gali/actions/workflows/ci.yml)
[![Hot Refresh](https://github.com/mocharil/gali/actions/workflows/refresh.yml/badge.svg)](https://github.com/mocharil/gali/actions/workflows/refresh.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> *"Gali lebih dalam dari kode sahamnya."*

Entri resmi **Sectors Hackathon 2026**, **Track 3 (Market Intelligence)**.

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
- Berapa valuasi wajar berbasis cadangan (**M2 Reserve-Backed Value**)?
- Izin ESDM (IUP/IUPK) mana yang akan kedaluwarsa dalam 1–5 tahun ke depan (**M3 License Cliff**)?
- Berapa estimasi cash cost per ton dan titik impas harga acuan (**M4 Cash Cost Curve**)?
- Berapa konsentrasi risiko pasar ekspor (**M6 Destination Stress Test**)?
- **Scenario Studio**: Simulasi interaktif pergeseran harga komoditas global dan tarif impor terhadap ranking valuasi secara live!

---

## 📊 Cakupan Data (Coal Titans Universe)

Universe analisis mencakup 9 emiten batubara terbesar di Indonesia:
- **7 Emiten Lengkap**: `AADI`, `ADMR`, `ADRO`, `BUMI`, `BYAN`, `GEMS`, `ITMG`
- **2 Emiten Parsial**: `DSSA`, `PTBA` (dilaporkan secara transparan dengan badge data parsial)

---

## 🛠️ Quickstart (Menjalankan Lokal dari Nol)

### Prasyarat
- Python 3.13
- Node.js 20+ & pnpm
- Docker & Docker Compose

### 1. Clone & Setup Lingkungan
```bash
git clone https://github.com/mocharil/gali.git
cd gali

# Jalankan database PostgreSQL 16 (port 5433) & Redis 7 (port 6379)
docker compose up -d postgres redis

# Buat virtual environment Python & install packages
python -m venv .venv
.\.venv\Scripts\activate          # Windows PowerShell
pip install -e packages/core -e packages/api -e packages/pipeline

# Install dependensi frontend web
cd packages/web
pnpm install
cd ../..
```

### 2. Konfigurasi Environment
```bash
cp .env.example .env
# Edit .env dan masukkan SECTORS_API_KEY jika ingin fetch live (atau biarkan GALI_DRY_RUN=1 untuk dev offline)
```

### 3. Migrasi & Ingest Data
```bash
# Jalankan migrasi database Alembic
alembic -c packages/core/alembic.ini upgrade head

# Ingest data & hitung Ground Truth metrik (0 kredit dari cache)
gali ingest --tier all --dry-run
gali metrics run
```

### 4. Jalankan Service
```bash
# Terminal 1: Jalankan FastAPI backend (port 8000)
uvicorn gali_api.main:app --reload --port 8000

# Terminal 2: Jalankan Next.js frontend (port 3000)
cd packages/web
pnpm dev
```
Buka browser di `http://localhost:3000`.

---

## 📚 Dokumentasi Proyek

| Dokumen | Deskripsi |
|---|---|
| [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md) | Desain teknis arsitektur monorepo, schema Postgres, keamanan, dan load test |
| [`docs/METRICS.md`](file:///docs/METRICS.md) | Rumus matematis dan metodologi perhitungan M1–M9 |
| [`docs/CREDIT_BUDGET.md`](file:///docs/CREDIT_BUDGET.md) | Audit realisasi penggunaan kredit Sectors API (405/1000 kredit terpakai) |
| [`docs/DATA_COVERAGE.md`](file:///docs/DATA_COVERAGE.md) | Laporan kelayakan data Coal Titans dan transparansi cakupan |
| [`BUILD_PLAN.md`](file:///BUILD_PLAN.md) | Rencana pengembangan dan status verifikasi seluruh fase |
| [`PROGRESS.md`](file:///PROGRESS.md) | Catatan log pengerjaan per sesi |

---

## 🔒 Keamanan & Audit

- **CORS Lockdown**: Origin dibatasi ketat ke domain resmi frontend.
- **Rate Limiting**: Sliding-window counter berbasis Redis (60 req/min publik).
- **Gitleaks Audit**: Bersih (0 temuan rahasia).

---

## ⚖️ Disclaimer

GALI adalah **alat informasi dan analisis data publik**, bukan nasihat investasi atau keuangan. Tidak ada rekomendasi beli/jual yang diberikan, dan tidak ada fungsi eksekusi perdagangan dalam bentuk apa pun. Seluruh angka turunan bergantung pada kelengkapan data sumber; lihat halaman `/coverage` untuk cakupan data yang sebenarnya. Lakukan riset mandiri sebelum mengambil keputusan finansial.

---

## 📜 Lisensi

Didistribusikan di bawah lisensi [MIT](LICENSE).
