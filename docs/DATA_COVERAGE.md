# DATA COVERAGE AUDIT — GALI

> Laporan audit empiris kelayakan data Sectors Financial API per **29 Agustus 2026**.
> Dihasilkan secara otomatis melalui pengujian live API bertahap (**Fase 1 · Hard Gate**).

---

## 1. Ringkasan Eksekutif & Keputusan Gate

- **Keputusan Gate**: **`NO_GO`**
- **Jumlah Emiten Terkualifikasi Penuh**: **7 emiten** (memiliki cadangan + produksi + finansial lengkap)
- **Total Perusahaan Tambang Terdeteksi**: 366 entitas
- **Perusahaan Tambang Berticker IDX**: 68 emiten
- **Total Titik Tambang (Sites) Terdata**: 156 situs (0 dengan koordinat GPS)
- **Total Kontrak Jasa Tambang**: 34 kontrak (9 terkait emiten)

> [!CAUTION]
> **STATUS: NO-GO (< 8 Emiten Terkualifikasi)**
> Hanya ditemukan 7 emiten dengan data lengkap.
> STOP dan laporkan ke Aril untuk aktivasi rencana cadangan.

---

## 2. Matriks Kelengkapan Data per Kandidat Emiten

| Symbol | Nama Perusahaan | Komoditas | Cadangan (Mt) | Produksi (Mt) | Revenue (USD) | Cash Cost (USD) | Ownership Tree | Destinasi Penjualan | Status |
|---|---|---|---|---|---|---|---|---|---|
| **AADI.JK** | PT Adaro Andalan Indonesi | Coal | 819.0 | 48.1 | $5,320,000,000 | $3,853,630,000 | 13 relasi | 6 negara | ✅ LENGKAP |
| **ADMR.JK** | PT Adaro Minerals Indones | Coal, Aluminium | 177.2 | 6.6 | $1,154,000,000 | $576,390,000 | 7 relasi | NULL | ✅ LENGKAP |
| **ADRO.JK** | PT Alamtri Resources Indo | Coal | 996.2 | 64.6 | $2,079,000,000 | $1,204,690,000 | 3 relasi | 7 negara | ✅ LENGKAP |
| **BUMI.JK** | PT Bumi Resources Tbk | Coal | 2354.0 | 74.7 | $1,360,000,000 | $1,190,390,000 | 4 relasi | 14 negara | ✅ LENGKAP |
| **BYAN.JK** | PT Bayan Resources Tbk | Coal | 2031.0 | 50.5 | $3,446,000,000 | $2,113,430,000 | 18 relasi | 9 negara | ✅ LENGKAP |
| **GEMS.JK** | PT Golden Energy Mines Tb | Coal | 899.2 | 50.7 | $2,705,000,000 | $1,600,940,000 | 6 relasi | 11 negara | ✅ LENGKAP |
| **ITMG.JK** | PT Indo Tambangraya Megah | Coal | 354.6 | 20.2 | $2,304,500,000 | $1,605,690,000 | 10 relasi | 13 negara | ✅ LENGKAP |
| **-** | PT Berau Coal Energy Tbk | Coal | 404.1 | 35.9 | NULL | NULL | 5 relasi | NULL | ⚠️ PARSIAL |
| **-** | PT Transkon Jaya Tbk | Coal, Gold, Copper | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **ABMM.JK** | PT ABM Investama Tbk | Coal | NULL | NULL | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |
| **AIMS.JK** | PT Artha Mahiya Investama | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **ALII.JK** | PT Ancara Logistics Indon | Coal | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **AMMN.JK** | PT Amman Mineral Internas | Copper, Gold | 3936.0 | 463.5 | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |
| **ANTM.JK** | PT Aneka Tambang Tbk | Nickel, Gold | 805.0 | 6393.0 | NULL | NULL | 6 relasi | NULL | ⚠️ PARSIAL |
| **ARCI.JK** | PT Archi Indonesia Tbk | Gold, Silver | 98.3 | 210.0 | NULL | NULL | 6 relasi | NULL | ⚠️ PARSIAL |
| **ARII.JK** | PT Atlas Resources Tbk | Coal | 290.1 | 6.3 | NULL | NULL | 7 relasi | NULL | ⚠️ PARSIAL |
| **BBRM.JK** | PT Pelayaran Nasional Bin | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **BESS.JK** | PT Batulicin Nusantara Ma | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **BIPI.JK** | PT Astrindo Nusantara Inf | Coal | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **BOSS.JK** | PT Borneo Olah Sarana Suk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **BRMS.JK** | PT Bumi Resources Mineral | Gold, Copper, Zinc and Lead | NULL | NULL | NULL | NULL | 6 relasi | NULL | ⚠️ PARSIAL |
| **BSML.JK** | PT Bintang Samudera Mandi | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **BSSR.JK** | PT Baramulti Suksessarana | Coal | 114.2 | 21.6 | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **CANI.JK** | PT Capitol Nusantara Indo | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **CBRE.JK** | PT Cakra Buana Resources  | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **CNKO.JK** | PT Exploitasi Energi Indo | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **COAL.JK** | PT Black Diamond Resource | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **CUAN.JK** | PT Petrindo Jaya Kreasi T | Coal | NULL | NULL | NULL | NULL | 8 relasi | NULL | ⚠️ PARSIAL |
| **DEWA.JK** | PT Darma Henwa Tbk | Coal | NULL | 17.3 | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **DKFT.JK** | PT Central Omega Resource | Nickel | NULL | 2.9 | NULL | NULL | 6 relasi | NULL | ⚠️ PARSIAL |
| **DOID.JK** | PT BUMA Internasional Gro | Coal | NULL | 90.0 | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |
| **DSSA.JK** | PT Dian Swastatika Sentos | Coal, Gold | NULL | 53.1 | $3,018,000,000 | $1,789,390,000 | 1 relasi | NULL | ⚠️ PARSIAL |
| **DWGL.JK** | PT Dwi Guna Laksana Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **FIRE.JK** | PT Alfa Energi Investama  | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **GTBO.JK** | PT Garda Tujuh Buana Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **HRUM.JK** | PT Harum Energy Tbk | Coal, Nickel | 64.0 | 56998.0 | NULL | NULL | 13 relasi | NULL | ⚠️ PARSIAL |
| **IATA.JK** | PT MNC Energy Investments | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **IFSH.JK** | PT Ifishdeco Tbk | Nickel | NULL | 2.0 | NULL | NULL | 7 relasi | NULL | ⚠️ PARSIAL |
| **INCO.JK** | PT Vale Indonesia | Nickel | NULL | 71311.0 | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **INDY.JK** | PT Indika Energy Tbk | Coal, Gold | NULL | NULL | $2,446,700,000 | $2,113,990,000 | 2 relasi | 10 negara | ⚠️ PARSIAL |
| **ITMA.JK** | PT Sumber Energi Andalan  | Coal | NULL | NULL | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |
| **KKGI.JK** | PT Resource Alam Indonesi | Coal | NULL | 5.9 | NULL | NULL | 2 relasi | NULL | ⚠️ PARSIAL |
| **KOBX.JK** | PT Kobexindo Tractors Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **MAHA.JK** | PT Mandiri Herindo Adiper | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **MBAP.JK** | PT Mitrabara Adiperdana T | Coal | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **MBMA.JK** | PT Merdeka Battery Minera | Nickel | NULL | 50315.0 | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **MBSS.JK** | PT Mitrabahtera Segara Se | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **MCOL.JK** | PT Prima Andalan Mandiri  | Coal | NULL | NULL | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |
| **MDKA.JK** | PT Merdeka Copper Gold Tb | Copper, Gold, Silver | 430.8 | 115.9 | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |
| **MYOH.JK** | PT Samindo Resources Tbk | Coal, Gold, Copper | NULL | 5.9 | NULL | NULL | 5 relasi | NULL | ⚠️ PARSIAL |
| **NCKL.JK** | PT Trimegah Bangun Persad | Nickel | NULL | NULL | NULL | NULL | 7 relasi | NULL | ⚠️ PARSIAL |
| **NICE.JK** | PT Adhi Kartiko Pratama T | Nickel | NULL | 1.8 | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **NICL.JK** | PT PAM Mineral Tbk | Nickel | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **PKPK.JK** | PT Perdana Karya Perkasa  | Coal | NULL | NULL | NULL | NULL | 2 relasi | NULL | ⚠️ PARSIAL |
| **PSAB.JK** | PT J Resources Asia Pasif | Gold | 86.5 | 100.7 | NULL | NULL | 4 relasi | NULL | ⚠️ PARSIAL |
| **PSSI.JK** | PT IMC Pelita Logistik Tb | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **PTBA.JK** | PT Bukit Asam Tbk | Coal | 2933.0 | 43.3 | NULL | NULL | 5 relasi | 12 negara | ⚠️ PARSIAL |
| **PTIS.JK** | PT Indo Straits Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **PTRO.JK** | PT Petrosea Tbk | Coal | NULL | NULL | NULL | NULL | 2 relasi | NULL | ⚠️ PARSIAL |
| **RIGS.JK** | PT Rig Tenders Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **RMKE.JK** | PT RMK Energy Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **SGER.JK** | PT Sumber Global Energy T | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **SMMT.JK** | PT Golden Eagle Energy Tb | Coal | NULL | NULL | NULL | NULL | 2 relasi | NULL | ⚠️ PARSIAL |
| **SMRU.JK** | PT SMR Utama Tbk | Coal | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **TCPI.JK** | PT Transcoal Pacific Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **TEBE.JK** | PT Dana Brata Luhur Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **TOBA.JK** | PT TBS Energi Utama Tbk | Coal, Nickel | NULL | NULL | NULL | NULL | 1 relasi | NULL | ⚠️ PARSIAL |
| **TPMA.JK** | PT Trans Power Marine Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **TRAM.JK** | PT Trada Alam Minera Tbk | Coal | NULL | NULL | NULL | NULL | 0 relasi | NULL | ⚠️ PARSIAL |
| **UNTR.JK** | PT United Tractors Tbk | Coal | NULL | NULL | NULL | NULL | 3 relasi | NULL | ⚠️ PARSIAL |

---

## 3. Cakupan Data Referensi Nasional & Pasar

### A. Komoditas & Benchmark Harga (Task 1.8)
- **Jumlah Komoditas**: 18 komoditas
- **Seri Harga Tersedia**: Gold, Silver, Coal, Aluminum, Chromium, Cobalt, Copper, Gold as a co-product, Iron, Lead, Manganese, Nickel, Silver as a co-product, Titanium, Zinc, Coal (HBA 1), Coal (HBA 2), Coal (HBA 3)

### B. Jejaring Kontrak Tambang (Task 1.9)
- **Total Kontrak Terdata**: 34 relasi
- **Kontrak Terhubung ke Emiten**: 9 relasi

### C. Situs & Titik Operasi Tambang (Task 1.6)
- **Total Situs**: 156
- **Situs dengan Koordinat GPS**: 0 (0.0%)
- **Situs dengan Angka Produksi**: 25
- **Situs dengan Strip Ratio**: 8

### D. Izin Usaha Pertambangan (IUP/IUPK ESDM) (Task 1.5)
- **Izin Tambang Diperiksa**: 750 izin
- **Izin dengan Company Slug Eksplisit**: 14 (1.9%)
- **Rata-rata Fuzzy Match Score pada Nama**: 63.3%

---

## 4. Realisasi Anggaran Kredit API (Task 1.12)

- **Total Kredit Terpakai**: **347 / 1000 kredit**
- **Plafon Batas Keras (Hard Cap)**: 950 kredit
- **Sisa Kredit di Bawah Cap**: 603 kredit

| Tier | Kredit Terpakai | Porsi (%) |
|---|---|---|
| cold | 48 | 13.8% |
| warm | 280 | 80.7% |
| hot | 19 | 5.5% |
