# Verifikasi mode lokal GALI

Verifikasi perubahan desain versi 0.3 tersedia di [DESIGN_VERIFICATION.md](DESIGN_VERIFICATION.md).

Tanggal: 5 Oktober 2026. Versi aplikasi: 0.2.0. Dataset: simulation-2026.09-v1, snapshot sintetis 30 September 2026.

| Pemeriksaan | Hasil |
|---|---|
| Generasi Python dan validasi schema API | 9 emiten, 18 operator, 36 lokasi, 62 izin; respons issuer, detail, graph, GeoJSON, curve, flow, coverage tervalidasi |
| Paritas skenario TypeScript/Python | 15 skenario, 1.890 field cocok; toleransi angka dibulatkan 0,02 |
| Kasus batas lokal | Request tidak valid, baseline tanpa shock, harga −100%, dan batas annuity 30 tahun lulus |
| Tes core terkait metrik dan skenario | 14 tes Python lulus |
| TypeScript, ESLint, production build | Lulus |
| E2E aplikasi lengkap | 11 tes lulus, tanpa flaky/skip; Chromium, build produksi |
| Responsif | 11 rute × 4 viewport (1440, 1280, 768, 390 px), tanpa overflow atau page error |
| Pengecekan akhir setelah perbaikan tampilan | 3 tes tambahan lulus: dataset/API/peta/metadata CSV dan viewport 1440/390 |
| Sumber CSV | Kolom Dataset Source=synthetic dan Dataset As Of=2026-09-30 terverifikasi |
| Peta lokal | 36 tombol lokasi, pencarian AADI menjadi 4 lokasi, titik dapat dipilih; tidak ada request eksternal dari dashboard/profil/peta |
| Persistensi skenario | Harga, negara, diskonto, dan biaya variabel mengikuti URL dan tetap sama setelah refresh |
| Integrasi backend | Mode sectors tidak memakai fallback sintetis (503 saat backend tidak ada); proxy meneruskan path, query, body respons, dan header rate limit |
| Launcher | Root launcher dan frontend launcher dijalankan pada Linux; argumen/path disusun lintas platform dan START_GALI.cmd disediakan. Windows native belum diuji di lingkungan ini |

Masalah yang ditemukan selama tes dan diperbaiki: hidrasi React akibat cache sidebar tersedia sebelum halaman selesai dihidrasi; penanda SVG saling menutup; header peta bertumpuk pada layar kecil; angka animasi di luar viewport awalnya terlihat nol. Sumber angka tetap sintetis, sementara perhitungannya memakai model sebenarnya.

Screenshot tersedia di `docs/screenshots/`: dashboard desktop/mobile, profil BYAN, skenario gabungan, dan peta mobile. Screenshot adalah tampilan dataset lokal, bukan bukti data pasar aktual.

Verifikasi ini tidak menyatakan deployment publik sudah diperbarui, API Sectors telah diuji dengan token, atau data sintetis memenuhi ketentuan sumber data kompetisi. Integrasi produksi dan laporan audit sebelumnya tetap tersedia di proyek.
