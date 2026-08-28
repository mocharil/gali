# PROGRESS — GALI

Log kerja. **Satu entri per sesi.** Format wajib seperti di bawah; jangan diubah strukturnya.
Aturan lengkapnya ada di `BUILD_PLAN.md` §0.

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
