# Verifikasi analisis GALI 0.4.0

5 Oktober 2026. Perubahan mencakup integritas input RLI/RBV, batas interpretasi model, pemeringkatan skor lengkap, sensitivitas bobot dan penjelasan skenario. UI mempertahankan sistem visual GALI dengan Plus Jakarta Sans lokal dan palet navy, amber, cyan.

## Perilaku yang diverifikasi

| Pemeriksaan | Hasil |
|---|---|
| Python core, API dan pipeline | 124 tes lulus; satu peringatan deprecation FastAPI/httpx |
| Acuan skenario Python terhadap TypeScript lokal | 15 skenario, 2.700 perbandingan field; array driver dan sensitivitas ikut dibandingkan |
| Pengujian research frontend | Peringkat lengkap/sementara, nilai seri, cakupan hilang, penyaringan asisten, sumber dan asumsi research brief lulus |
| Build produksi, TypeScript dan ESLint | Lulus pada Node 24.19.0, Next.js 15.5.26 |
| Browser produksi | 16 tes Chromium lulus, termasuk pemisahan skor parsial, export brief, rugi kotor, pemilihan emiten dan tautan metodologi |
| Penyempurnaan label grafik ponsel | Lima tes research diulang setelah perubahan visual; seluruhnya lulus dan semua langkah waterfall terlihat pada viewport 390 px |
| Responsif | 11 rute pada 1440×900, 1280×800, 768×1024 dan 390×844; tanpa overflow horizontal pada pemeriksaan rute |
| Capture visual | 10 tampilan halaman, navigasi/asisten ponsel dan 5 panel analisis; tanpa page error atau request eksternal pada pemeriksaan halaman dengan origin eksternal diblokir |
| Font dan kontras | Plus Jakarta Sans lokal dimuat; tujuh token teks pada surface/canvas ≥4,5:1, terendah 4,53:1 |
| Masukan sintetis | `data/simulation/inputs.json` identik dengan paket 0.3.0; dataset turunan dihitung ulang menggunakan mesin baru |

Tes numerik menggunakan benchmark annuitas yang dihitung tahun demi tahun, batas diskonto nol, rumus pendapatan/biaya yang dihitung terpisah, serta kasus cadangan dan produksi yang berasal dari entitas berbeda. Tes lain memastikan kepemilikan tidak diasumsikan 100%, `profit_usd` tanpa basis laba kotor tidak dipakai, input nonfinite tidak menjadi angka API, dan tidak ada pengecualian berdasarkan ticker.

Pemeriksaan screenshot awal menemukan mismatch hidrasi yang tidak muncul pada suite browser biasa. Elemen `main` dipindahkan ke layout server sehingga frame konten tetap stabil ketika shell memperbarui status data. Suite browser produksi dan capture lengkap kemudian lulus. Tes navigasi tambahan memanaskan beberapa rute sebelum kembali ke landing pada desktop/ponsel dengan reduced motion.

Untuk skenario, perubahan harga dan permintaan dihitung bersama dengan biaya tetap/variabel. Kontribusi waterfall mengikuti harga → volume → izin → diskonto dan menjumlah ke perubahan headline. Kerugian kotor tetap negatif saat RBV dibatasi nol. Sel sensitivitas aktif sama dengan hasil skenario; batas parameter dipotong dan dideduplikasi. Nilai RBV seri mendapat peringkat ukuran yang sama.

## Cakupan dan interpretasi

Dataset lokal memiliki 9 emiten, 18 operator, 36 lokasi, 62 izin dan 54 kontrak. Snapshot bertanggal 30 September 2026, dengan periode finansial 2025. Seluruh angka, operator, lokasi, izin dan alur penjualan merupakan input sintetis, bukan hasil pengambilan Sectors aktif.

Tujuh emiten lengkap untuk metrik utama RLI, RBV dan biaya. Enam emiten memenuhi kelengkapan lima pilar skor dan masuk peringkat lengkap. `ADMR` memiliki cakupan bobot 85% karena risiko kontraktor tidak tersedia; `PTBA` dan `DSSA` memiliki cakupan 75% dan input metrik utama parsial. Ketiganya tetap dapat ditelusuri tanpa mendapat peringkat lengkap.

Sensitivitas bobot memakai 11 konfigurasi: bobot awal, lalu masing-masing dari lima bobot dikalikan 0,8 dan 1,2 secara terpisah sebelum dinormalisasi. Hasil adalah rentang skor/peringkat, bukan confidence interval. Field API lama `confidence_pct` tetap kompatibel, tetapi di UI dijelaskan sebagai cakupan bobot.

RBV adalah proksi annuitas laba kotor dengan batas umur 30 tahun, bukan free cash flow atau nilai wajar ekuitas. Scope operator, cakupan finansial, asumsi dan input yang hilang tersedia di Evidence. Gap terhadap kapitalisasi pasar memakai label netral dan universe peer yang memenuhi syarat skor lengkap.

Research brief mengambil fakta dari hasil skenario dan menyertakan parameter, driver, sensitivitas, batas model, sumber dan langkah riset berikutnya. Brief serta Asisten Data berbasis aturan deterministik; tidak ada klaim integrasi LLM baru.

## Reproduksi

Frontend lokal:

```bash
npm run setup
npm run test:analysis
npm --prefix packages/web run typecheck
npm --prefix packages/web run lint
npm run build
npm --prefix packages/web exec playwright install chromium
PLAYWRIGHT_DATA_MODE=simulation npm --prefix packages/web run test:e2e
```

Pada PowerShell, set `$env:PLAYWRIGHT_DATA_MODE = "simulation"` sebelum menjalankan perintah E2E. `npm run local` menjalankan aplikasi tanpa API key setelah dependency terpasang; jangan jalankan dev server bersamaan dengan build pada direktori `.next` yang sama.

Pengujian Python menggunakan virtual environment dengan dependensi core/API dan fixture database terisolasi. Lingkungan verifikasi ini memakai gateway PostgreSQL PGlite/WASM karena binary PostgreSQL native tidak tersedia, dengan prepared statements dinonaktifkan dan adapter QA untuk acknowledgement rollback gateway. Adapter memastikan status transaksi idle sebelum menerima rollback. Adapter tersebut hanya berada di lingkungan pengujian, tidak mengubah aplikasi. Gunakan PostgreSQL biasa dan instruksi fixture pada README untuk reproduksi native.

Ruff linter dan formatter pada seluruh proyek lulus. Mypy memeriksa 36 file sumber core tanpa masalah. Koneksi Sectors bertoken aktif, PostgreSQL native, browser selain Chromium, deployment publik, pengujian pengguna dan validasi nilai ekuitas berbasis free cash flow tidak termasuk verifikasi ini.

SHA-256 masukan sintetis yang dipertahankan: `13cfb5a198135fb85f02efca3d054856ab38e55f30cf6c52e87f6e3951b640b1`.

Panel visual: [skenario desktop](screenshots/research-scenario-desktop.png), [skenario ponsel](screenshots/research-scenario-mobile.png), [rugi kotor](screenshots/research-gross-loss.png), [skor sementara](screenshots/research-score-provisional.png) dan [konteks RBV](screenshots/research-rbv-context.png). Ringkasan capture ada di `research-visual-qa.json` dan `screenshots/research-capture-verification.json`.
