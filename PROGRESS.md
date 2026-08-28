# PROGRESS — GALI

Log kerja. **Satu entri per sesi.** Format wajib seperti di bawah; jangan diubah strukturnya.
Aturan lengkapnya ada di `BUILD_PLAN.md` §0.

---

## 2026-08-29 — Fase 0 (parsial)

**Selesai:** 0.6, 0.7

**Detail yang terverifikasi:**
- Struktur monorepo §2.4 dibuat: `packages/{core,api,pipeline,web}`, `infra/`, `docs/`,
  `.github/workflows/`
- `.gitignore`, `.env.example`, `LICENSE` (MIT), `docker-compose.yml`,
  `infra/initdb/01-extensions.sql`
- `docker compose up -d postgres redis` → `gali-postgres` healthy, `gali-redis` healthy.
  Ekstensi terverifikasi via `psql`: `btree_gin`, `pg_trgm`, `plpgsql`
- `.venv` Python 3.13.13; `gali-core`, `gali-api`, `gali-pipeline` ter-install editable.
  Dagster 1.13.20, FastAPI 0.141.1, SQLAlchemy 2.0.52, Alembic 1.19.1 resolve bersih
- `gali_core/config.py` — `Settings` + `Assumptions` + `COAL_BENCHMARK_BANDS`; terverifikasi load
- `gali_core/db/base.py` — Base, naming convention, engine async (asyncpg) + sync (psycopg)
- `gali_core/db/models.py` — `raw.responses`, `ops.credit_ledger`, `ops.api_key`,
  `ops.data_coverage`; terverifikasi import (4 tabel, 31 kolom)

**Blocker:** `SECTORS_API_KEY` belum ada → task 0.11 (smoke test) tidak bisa dijalankan.
Task 0.1–0.4 dan 0.8 menunggu tindakan Aril.

**Kredit terpakai sesi ini:** 0 (kumulatif: 0 / 1000)

**Keputusan yang diambil:**
1. **Postgres di host port 5433, bukan 5432.** Port 5432 sudah dipakai container lain milik user
   (`video_clipper_postgres`, up 7 jam, healthy) yang tidak boleh diganggu. `.env.example` dan
   `docker-compose.yml` sudah menyesuaikan.
2. **Python 3.13, bukan 3.12** seperti di spec awal. Mesin ini hanya punya 3.10 / 3.11 (Store) /
   3.13. Dagster 1.13.20 resolve bersih di 3.13, jadi tidak ada risiko yang tersisa.
3. **Satu venv di root** untuk ketiga paket Python, bukan venv per paket. Alasannya: paket-paket ini
   saling impor (`gali-api` dan `gali-pipeline` sama-sama bergantung pada `gali-core`), dan satu
   venv membuat editable install saling terlihat tanpa path hack.
4. **Repo GitHub: `Mocharil/gali`, publik** — diputuskan Aril. Akun `mocharil` sudah terautentikasi
   via `gh` dan berstatus active di mesin ini. Agent pelaksana yang membuat repo-nya di task 0.5.
   Catatan aturan: repo wajib tetap publik minimal 90 hari setelah pengumuman (9 Okt 2026).

**Next:** 0.5 (`git init` + first commit — tunggu keputusan Aril soal akun GitHub), lalu 0.9
(Alembic), 0.10 (`SectorsClient`), 0.12 (CI), 0.13.
