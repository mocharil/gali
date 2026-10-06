# GALI 0.4.1: penyempurnaan UI

Rilis ini menyederhanakan pembacaan hasil analisis sambil mempertahankan font Plus Jakarta Sans dan warna navy, amber, serta cyan GALI.

| Bagian | Perilaku baru |
|---|---|
| Dashboard | Tiga temuan tekanan ditampilkan lebih dahulu. Kartu emiten memisahkan skor lengkap dari skor sementara. Matriks, peta, dan asumsi dibuka saat diperlukan. |
| Profil emiten | Tab Ringkasan, Valuasi, Operasi & izin, serta Skor & cakupan. Tombol cetak mencetak bagian aktif. Tab mendukung tombol panah, Home, dan End; bantuan metrik ditutup dengan Escape. |
| Peta | Tampilan nasional mengelompokkan lokasi per wilayah. Pilih kelompok untuk melihat titik individual; garis tetap menuju koordinat asli. Filter emiten, provinsi, dan pencarian berlaku bersama pada peta dan daftar. |
| Navigasi | Sidebar, header, dan pencarian fitur menggunakan sumber label yang sama. Daftar emiten dapat dibuka-tutup. Tab profil tersusun 2×2 pada mobile. |
| Cakupan data | Bar kelengkapan memakai warna berdasarkan persentase tersedia. Label utama dan unit diperjelas. |

Teks bantuan RLI tidak lagi menyebut kapitalisasi pasar hilang hanya karena umur tersirat tidak tersedia. Kualitas batubara dipisahkan dari radar sehingga kartu tidak teregang oleh tinggi kartu tetangganya. Tautan skenario dari profil membawa emiten yang sedang dibaca.

## Verifikasi

- Build produksi, pengecekan TypeScript, dan ESLint berhasil.
- 18 tes browser lulus, tanpa gagal, skip, atau flaky.
- 11 route diperiksa pada 1440×900, 1280×800, 768×1024, dan 390×844.
- 19 screenshot ditinjau; tidak ada halaman melebar ke samping, error runtime, atau request eksternal pada dataset lokal.
- Kontras teks utama minimal 4,53:1 terhadap permukaan dan canvas.
- 103 file analitis, termasuk input dan dataset turunan, sama persis dengan paket 0.4.0. Formula dan angka data tetap sama.

Hasil terstruktur: `ui-polish-qa-summary.json`, `ui-polish-visual-qa.json`, dan `ui-polish-model-integrity.json`. Screenshot ada di `screenshots/`. Tes memakai dataset lokal; integrasi basemap/Sectors live dan deployment publik tidak dijalankan pada rilis ini.

## Jalankan

Dari root proyek:

```bash
npm run local
```

Buka http://localhost:3000. Windows dapat memakai `START_GALI.cmd`. Jika terminal dibuka di `packages/web`, jalankan `npm ci` kemudian `npm run local`.
