# GALI

**Ground-truth Analytics for Listed Issuers** — *"Gali lebih dalam dari kode sahamnya."*

Entri **Sectors Hackathon 2026**, Track 3 (Market Intelligence).

GALI menilai emiten komoditas IDX dari **tambang fisiknya**, bukan dari grafik harganya: berapa ton
cadangan tersisa, berapa tahun lagi habis, berapa cash cost per ton, izin ESDM mana yang kedaluwarsa,
dan ke negara mana hasilnya dijual — lalu membandingkannya dengan yang sedang dihargai pasar.

> **Status: dalam pengembangan.** Lihat `BUILD_PLAN.md` untuk spesifikasi lengkap dan
> `PROGRESS.md` untuk keadaan terkini.

## Dokumen

| File | Isi |
|---|---|
| `BUILD_PLAN.md` | Spesifikasi lengkap: arsitektur, data model, rumus metrik, 10 fase build |
| `AGENT_PROMPT.md` | Prompt kickoff untuk agent pelaksana |
| `PROGRESS.md` | Log kerja per sesi |

## Development

```bash
docker compose up -d postgres redis     # postgres :5433, redis :6379
cp .env.example .env                    # isi SECTORS_API_KEY
```

Python 3.13. Ketiga paket di `packages/` di-install editable ke satu venv di root.

## Disclaimer

GALI adalah **alat informasi dan analisis**, bukan nasihat investasi. Tidak ada rekomendasi
beli/jual yang diberikan, dan tidak ada fungsi eksekusi perdagangan dalam bentuk apa pun. Seluruh
angka turunan bergantung pada kelengkapan data sumber; lihat halaman `/coverage` untuk cakupan data
yang sebenarnya. Lakukan riset sendiri sebelum mengambil keputusan finansial.

## Lisensi

MIT — lihat `LICENSE`.
