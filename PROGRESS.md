# PROGRESS — GALI

Log kerja. **Satu entri per sesi.** Format wajib seperti di bawah; jangan diubah strukturnya.
Aturan lengkapnya ada di `BUILD_PLAN.md` §0.

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
