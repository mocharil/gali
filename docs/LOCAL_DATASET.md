# Menjalankan dashboard tanpa token

Mode lokal menyertakan snapshot sintetis 30 September 2026: **9 emiten, 18 operator fiktif, 36 lokasi, 62 izin, dan 54 kontrak**. Dataset ini disusun untuk memperlihatkan seluruh alur analitik ketika API tidak tersedia. Angka bukan laporan aktual perusahaan. Asal dataset tampil singkat di status aplikasi, halaman Coverage, Evidence, header API, dan ekspor CSV.

## Windows: satu perintah

Pasang Node.js 20.9+ dengan npm. Ekstrak ZIP ke folder proyek, buka terminal pada folder yang berisi `START_GALI.cmd`, kemudian:

```powershell
npm run local
```

Atau klik dua kali `START_GALI.cmd`. Launcher memasang dependency dengan `npm ci` jika Next belum terpasang, lalu membuka server di **http://localhost:3000**. Pemasangan pertama membutuhkan internet ke npm; sesudah dependency terpasang, halaman, peta, dan perhitungan berjalan tanpa API eksternal, Python, Docker, database, atau token.

Jika terminal sudah berada pada `packages/web`:

```powershell
npm ci
npm run local
```

`npm run demo` tetap tersedia sebagai alias mode yang sama. `npm run dev` pada root menjalankan mode lokal; `npm run dev` di `packages/web` mengikuti konfigurasi lingkungan dan default integrasi Sectors.

Jika port 3000 terpakai:

```powershell
$env:PORT="3001"
npm run local
```

Gunakan terminal kedua untuk perintah pengujian; jangan menutup terminal server selama presentasi.

## Build untuk presentasi

```powershell
# Dari root proyek
npm run setup
npm run build
npm run start
```

Build memerlukan dependency npm, tetapi tidak membutuhkan backend. Launcher build/start memastikan `GALI_DATA_MODE=simulation`; mode tidak ditentukan oleh token kosong atau kegagalan API.

## Alur penjelajahan

1. **Dashboard:** matriks harga −20%, permintaan China −30%, dan izin ≤3 tahun. Kartu agregat hanya memakai emiten lengkap dengan RBV terhitung. Klik setiap stress test untuk membuka parameter skenario.
2. **BYAN:** biaya rendah dan bantalan margin lebar, dengan konsentrasi China dan cliff izin. Bandingkan dengan **BUMI** yang memiliki margin lebih tipis; kehilangan laba kotor akibat harga turun lebih besar.
3. **GEMS:** lihat cliff izin 1/3/5 tahun dan telusuri tanggal setiap izin. Stress izin mengurangi umur cadangan memakai porsi luas, bukan menganggap produksi langsung hilang sebesar porsi yang sama.
4. **Scenario Studio:** gabungkan harga, negara tujuan, diskonto, biaya variabel, dan izin. Hasil, peringkat, CSV, dan URL mengikuti parameter terbaru. Reset kembali ke RBV snapshot tanpa perubahan.
5. **Peta:** semua 36 lokasi ditampilkan pada peta skematis lokal. Pilih lokasi, cari emiten/provinsi, salin koordinat, dan buka profil. Koordinat sintetis bukan GPS terverifikasi.
6. **Compare, cost curve, divergence, asisten berbasis aturan, dan Coverage** menggunakan snapshot yang sama. PTBA/DSSA sengaja parsial untuk memperlihatkan perlakuan data yang hilang.

## Perhitungan dan batas model

Input berada di `data/simulation/inputs.json`. `scripts/build_simulation_dataset.py` menjalankan fungsi produksi `gali_core` M1–M9, memvalidasi respons dengan schema Pydantic API, dan menghasilkan JSON yang digunakan Next.js. Tidak ada panggilan Sectors saat membangun snapshot ini.

`packages/web/lib/simulation/scenario.ts` memindahkan rumus engine Python ke TypeScript agar interaksi tidak membutuhkan proses Python. Test membandingkan 15 skenario dan 1.890 field, termasuk baseline nol, harga −100%, perubahan negara, biaya variabel, diskonto, izin, serta data parsial/proksi.

Rumus pendapatan/biaya:

```text
volume_risk = sum(destination_volume_share × destination_reduction)
post_revenue = revenue × (1 + price_shock) × (1 − volume_risk)
post_cost = cost × ((1 − variable_share) + variable_share × (1 − volume_risk))
post_gross_profit = max(post_revenue − post_cost, 0)
post_RLI = RLI × (1 − license_area_cliff_3y / 100), hanya jika shock izin aktif
RBV = gross_profit × (1 − (1 + discount_rate)^(-min(RLI, 30))) / discount_rate
```

RBV menggunakan laba kotor, bukan free cash flow. RLI memakai cadangan proven + probable dan produksi tertimbang kepemilikan. Skor adalah persentil relatif terhadap universe; komponen hilang tidak diisi nol dan bobot tersedia dinormalisasi. Cliff memakai luas izin. Margin belum mencakup overhead, pajak, capex, atau modal kerja. Agregat antar emiten dapat tumpang tindih pada kepemilikan bersama. Synthetic flows adalah skenario arus transaksi, bukan sinyal transaksi aktual.

## Mengubah dataset

Ubah file input, kemudian aktifkan virtual environment proyek dan jalankan:

```powershell
python scripts/build_simulation_dataset.py
cd packages/web
npm run test:simulation
npm run typecheck
npm run lint
npm run demo:build
npx playwright install chromium
npm run test:local
```

Python hanya diperlukan saat regenerasi, bukan menjalankan dashboard. Output dibundel agar setiap instalasi memiliki hasil yang konsisten.

## Integrasi Sectors

Integrasi asli tetap tersedia. Ikuti Quickstart backend pada README, isi API key server-side, muat cache dan publish metrics, lalu jalankan `npm run sectors` pada root atau `packages/web`. Mode `sectors` mengarah ke backend `API_URL` dan menampilkan kegagalan jika backend gagal; tidak mengganti data diam-diam dengan angka sintetis. Pilih mode secara eksplisit saat build/start jika melakukan deployment.

Dataset ini memperlihatkan alur produk, tetapi tidak mengubah kewajiban sumber data kompetisi. Pastikan ketentuan penyelenggara sebelum mengajukannya sebagai submission.
