# Verifikasi desain GALI 0.3.0

Catatan historis untuk versi 0.3.0. Screenshot halaman di folder yang sama diperbarui pada versi 0.4.0; verifikasi terbaru tersedia di [RESEARCH_VERIFICATION.md](RESEARCH_VERIFICATION.md).

5 Oktober 2026. Adaptasi visual Organa memakai font Plus Jakarta Sans dan palet navy, amber, cyan GALI. Pengujian dijalankan pada build produksi, Chromium, Node.js 24 dan Next.js 15.5.26.

| Pemeriksaan | Hasil |
|---|---|
| Production build, TypeScript dan ESLint | Lulus |
| E2E akhir | 11 lulus, 0 gagal, 0 flaky, 0 skip |
| Responsif | 11 rute pada 1440×900, 1280×800, 768×1024, 390×844 |
| Overflow dan JavaScript | Tidak ada overflow horizontal atau page error pada pemeriksaan rute |
| Alur kerja | Landing, dashboard, issuer, evidence, search, assistant, scenario, CSV, peer comparison, cost curve, peta, coverage, divergence |
| State data | API gagal, data kosong, emiten tidak ditemukan, emiten parsial teruji |
| Persistensi | Parameter skenario dan pilihan sidebar bertahan setelah refresh |
| Font | Plus Jakarta Sans variable 200–800 dimuat dari aplikasi, bukan font fallback |
| Angka utama | Langsung tampil lengkap; konsisten desktop/ponsel dan reduced motion |
| Kontras teks | 7 token teks pada surface/canvas ≥4,5:1; terendah 4,53:1 |
| Sentuhan | Kontrol utama header ponsel terukur 44×44 px; tombol ponsel minimal tinggi 44 px |
| Reduced motion | CSS dan grafik radar/bar merespons preferensi; capture menggunakan reduced motion |
| Request eksternal | 0 pada 10 pemeriksaan capture mode lokal, dengan origin eksternal diblokir |
| Integritas data dan mesin | 70 file backend, dataset, API dan analisis dibandingkan dengan paket 0.2; seluruhnya identik |
| Artefak visual | 10 screenshot halaman, ditambah navigasi dan asisten ponsel |

Screenshot tersedia di `docs/screenshots/`. Detail font, geometry, kontrol, token warna, dan kontras ada di `docs/design-qa.json`. Daftar pemeriksaan integritas ada di `docs/design-data-integrity.json`.

Verifikasi ini mencakup paket lokal. Deployment publik, browser selain Chromium, Windows native, dan koneksi Sectors dengan token aktif tidak diuji dalam pekerjaan adaptasi visual ini. Sumber dataset lokal tetap sintetis; screenshot menunjukkan tampilan aplikasi, bukan bukti data pasar aktual.
