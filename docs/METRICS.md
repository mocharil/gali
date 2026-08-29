# GALI METRICS METHODOLOGY & GROUND TRUTH SPECIFICATION

> **Dokumentasi Resmi Metodologi Metrik M1–M9, Mesin Skenario, & Provenance Audit**
> Versi Metodologi: `2.0-verified` · Tanggal: **29 Agustus 2026**

---

## 1. Ikhtisar Metodologi & Prinsip Dasar

GALI (**Ground-truth Analytics for Listed Issuers**) memadukan data bursa publik (IDX) dengan data operasional fisik, geospasial, dan perizinan hulu (Kementerian ESDM & Sectors Mining Intelligence) untuk membongkar realitas fundamental emiten sumber daya alam Indonesia.

### Prinsip Utama Integritas Data GALI:
1. **Zero Guesswork / No Proxy Hallucination**: Field yang bernilai `NULL` di data hulu tetap bernilai `NULL` di output. Dilarang menggunakan rata-rata industri, estimasi tebakan, atau imputasi tanpa dasar.
2. **Audit Provenance**: Setiap angka yang dihasilkan terhubung langsung ke ID respons mentah (`raw.responses.id`) dan mencatat alasan eksplisit untuk field yang kosong.
3. **Weight Re-normalization**: Jika data komponen pada suatu emiten tidak tersedia, bobot komponen tersebut diabaikan (*dropped*) dan bobot komponen yang tersedia dinormalisasi ulang hingga berjumlah 100%, dengan mencatat bobot efektif pada skor kepercayaan (*confidence*).
4. **Blue/Green Atomic Publishing**: Metrik dihitung dalam status `building`, divalidasi melalui gerbang integritas (*sanity gate*), dan dipublikasikan secara atomik tanpa *downtime*.

---

## 2. Spesifikasi Metrik Fundamental & Operasional (M1–M9)

### M1 — Reserve Life Index (RLI)

- **Deskripsi**: Mengukur sisa umur operasional cadangan tambang (dalam tahun) berdasarkan tingkat produksi saat ini dan porsi kepemilikan efektif emiten atas entitas operasional.
- **Formula**:
  $$\text{reserves}(s) = \sum_{c} \text{eff\_own}(s,c) \times \text{total\_reserves\_Mt}(c)$$
  $$\text{production}(s) = \sum_{c} \text{eff\_own}(s,c) \times \text{production\_volume}(c)$$
  $$\text{RLI}(s) = \frac{\text{reserves}(s)}{\text{production}(s)}$$
- **Golden Test Benchmark**: Adaro (AADI) = $819.0\text{ Mt} / 48.11\text{ Mt} = 17.02 \pm 0.05$ tahun.
- **Batasan Data**: Jika cadangan tambang tidak dilaporkan (misal DSSA), RLI bernilai `NULL`.

---

### M2 — Reserve-Backed Value (RBV) & Implied Life

- **Deskripsi**: Menghitung nilai wajar aset cadangan menggunakan diskonto arus kas laba kotor anuitas selama sisa umur tambang, membandingkannya dengan kapitalisasi pasar bursa (*RBV Gap*), dan memecahkan umur tambang tersirat (*Implied Life*).
- **Formula**:
  $$\text{GP}(c) = \text{revenue\_usd}(c) - \text{cost\_of\_revenue\_usd}(c)$$
  $$\text{attributable\_GP}(s) = \sum_{c} \text{eff\_own}(s,c) \times \text{GP}(c)$$
  $$\text{RBV}(s) = \text{attributable\_GP}(s) \times \frac{1 - (1+r)^{-\min(\text{RLI}(s), 30)}}{r}$$
  $$\text{rbv\_gap\_pct}(s) = \frac{\text{market\_cap\_usd}(s) - \text{RBV}(s)}{\text{RBV}(s)} \times 100$$
  $$\text{implied\_life}(s) = \frac{-\ln\left(1 - \frac{\text{market\_cap\_usd}(s) \times r}{\text{attributable\_GP}(s)}\right)}{\ln(1+r)}$$
  $$\text{reserve\_life\_gap}(s) = \text{implied\_life}(s) - \text{RLI}(s)$$
- **Asumsi Parameter**:
  - `discount_rate` ($r$): Default $0.12$ (12% hurdle rate untuk ekuitas sumber daya alam Indonesia).
  - `fx_idr_usd`: Default $16,200.0$ IDR/USD.
  - `max_annuity_years`: 30 tahun.
- **Kasus Unbounded**: Jika $\text{market\_cap\_usd} \times r \ge \text{attributable\_GP}$, pasar mengasumsikan umur tambang tak terhingga $\implies \text{implied\_life} = \text{NULL}$ dengan flag `"unbounded": true`.

---

### M3 — License Cliff

- **Deskripsi**: Mengidentifikasi risiko kedaluwarsa konsesi tambang (IUP/IUPK) dalam horizon waktu 1, 3, dan 5 tahun ke depan, rasio sertifikasi Clean and Clear (CNC), serta sisa hari rata-rata tertimbang.
- **Formula**:
  $$\text{cliff}_{Ny}(s) = \frac{\sum \{ l \in L(s) : l.\text{expiry} \le \text{today} + N\text{y} \land l.\text{activity} = \text{'Operasi Produksi'} \} \text{licensed\_area\_ha}}{\sum \{ l \in L(s) \} \text{licensed\_area\_ha}}$$
  $$\text{cnc\_coverage\_pct}(s) = \frac{\sum_{l \in L(s), l.\text{cnc} = \text{'CNC'}} \text{licensed\_area\_ha}}{\sum_{l \in L(s)} \text{licensed\_area\_ha}} \times 100$$
  $$\text{weighted\_days\_to\_expiry}(s) = \frac{\sum_{l \in L(s)} (\text{area}_l \times \text{days\_to\_expiry}_l)}{\sum_{l \in L(s)} \text{area}_l}$$

---

### M4 — Cash Cost Curve & Breakeven

- **Deskripsi**: Menghitung biaya tunai penambangan per ton (FOB Cash Cost), harga realisasi penjualan rata-rata, margin unit, posisi persentil pada kurva biaya nasional kumulatif, dan harga titik impas (*breakeven*).
- **Formula**:
  $$\text{mining\_cost}(c) = \text{cost\_of\_revenue\_usd}(c) - \text{cost\_of\_revenue\_breakdown}.\text{get}('purchased\_coal', 0)$$
  $$\text{tons}(c) = \text{sales\_volume} \times 10^6$$
  $$\text{cash\_cost\_per\_ton}(c) = \frac{\text{mining\_cost}(c)}{\text{tons}(c)}$$
  $$\text{realized\_price\_per\_ton}(c) = \frac{\text{mining\_revenue}(c)}{\text{tons}(c)}$$
  $$\text{unit\_margin}(c) = \text{realized\_price\_per\_ton} - \text{cash\_cost\_per\_ton}$$
  $$\text{breakeven\_benchmark\_price}(c) = \text{benchmark\_price} \times \frac{\text{cash\_cost}}{\text{realized}}$$
- **Kurva Biaya Nasional**: Seluruh emiten batubara diurutkan menaik berdasarkan `cash_cost_per_ton`. Sumbu-X merepresentasikan produksi kumulatif (Mt). `cost_curve_percentile` merepresentasikan titik tengah volume kumulatif terhadap total volume industri.

---

### M5 — Quality-Adjusted Realization

- **Deskripsi**: Memetakan rata-rata nilai kalori (Calorific Value / CV kcal/kg GAR) produk batubara emiten ke dalam standar acuan industri (Indonesian Coal Index / Newcastle).
- **Klasifikasi Grade Batubara**:
  - $\text{CV} < 4200\text{ kcal/kg} \implies \text{ICI-4 (4200 GAR)}$
  - $4200 \le \text{CV} < 5000\text{ kcal/kg} \implies \text{ICI-3 (5000 GAR)}$
  - $5000 \le \text{CV} < 5800\text{ kcal/kg} \implies \text{ICI-2 (5800 GAR)}$
  - $\text{CV} \ge 5800\text{ kcal/kg} \implies \text{ICI-1 / Newcastle (6000 GAR)}$
- **Diskon/Premi Kualitas**:
  $$\text{quality\_discount\_pct} = \frac{\text{benchmark\_price} - \text{realized\_price\_per\_ton}}{\text{benchmark\_price}} \times 100$$

---

### M6 — Destination Stress Test & Concentration HHI

- **Deskripsi**: Mengukur konsentrasi pasar ekspor emiten menggunakan Herfindahl-Hirschman Index (HHI) dan mengidentifikasi porsi negara tujuan utama.
- **Formula**:
  $$\text{destination\_hhi}(s) = \sum_{\text{country}} (\text{pct\_of\_sales\_volume}(s, \text{country}))^2 \quad [0 - 10000]$$

---

### M7 — Contractor / Supply-Chain Graph

- **Deskripsi**: Mengevaluasi ketergantungan pada kontraktor jasa penambangan tunggal dan proporsi kontrak operasional yang jatuh tempo dalam kurun 12 bulan ke depan.
- **Formula**:
  $$\text{contractor\_hhi}(s) = \sum_{\text{contractor}} (\text{share of owner's contracts})^2 \quad [0 - 10000]$$
  $$\text{contract\_cliff\_12m}(s) = \frac{\text{jumlah kontrak dengan end\_date} \le \text{today} + 1\text{y}}{\text{total kontrak}} \times 100$$

---

### M8 — Ground Truth Score (0–100)

- **Deskripsi**: Skor komposit fundamental aset (bukan sinyal beli/jual teknikal) yang menggabungkan 5 pilar utama melalui ranking persentil lintas universe.
- **Struktur Bobot Dasar & Arah**:
  1. **RLI** (Bobot 25%, arah: tinggi lebih baik)
  2. **License Cliff 3y** (Bobot 20%, arah: rendah/minim risiko lebih baik)
  3. **Cost Curve Percentile** (Bobot 25%, arah: biaya murah lebih baik)
  4. **Destination HHI** (Bobot 15%, arah: diversifikasi lebih baik)
  5. **Contractor Risk** (Bobot 15%, arah: minim risiko kontrak lebih baik)
- **Normalisasi Ulang Dinamis**:
  $$\text{norm\_weight}_i = \frac{\text{base\_weight}_i}{\sum_{j \in \text{Available}} \text{base\_weight}_j}$$
  $$\text{Ground Truth Score}(s) = \sum_{i \in \text{Available}} \text{percentile\_score}_i(s) \times \text{norm\_weight}_i$$
  $$\text{confidence}(s) = \sum_{j \in \text{Available}} \text{base\_weight}_j$$

---

### M9 — Market Divergence

- **Deskripsi**: Mengukur disparitas antara valuasi pasar (persentil RBV Gap) dan kualitas aset dasar (persentil Ground Truth Score), dilengkapi overlay arus dana investor asing (*Foreign Flow*) dan sentimen transaksi orang dalam (*Insider Filings*).
- **Formula**:
  $$\text{divergence}(s) = \text{percentile}(\text{rbv\_gap\_pct}) - \text{percentile}(\text{ground\_truth\_score})$$
- **Kuadran Interpretasi**:
  - `Overvalued Premia / Weak Ground Truth`: Valuasi pasar tinggi di atas nilai aset dasar.
  - `Deep Value Discount / Strong Ground Truth`: Valuasi pasar terdiskon relatif terhadap kekuatan fundamental cadangan dan biaya operasional.

---

## 3. Mesin Simulasi Skenario Parametrik (Scenario Studio)

Mesin simulasi in-memory berkinerja tinggi ($< 50$ ms) untuk mengevaluasi dampak makroekonomi secara live:
1. **Shock Harga Komoditas** ($\pm \Delta\%$).
2. **Shock Pembatasan Impor Negara Tujuan** ($\Delta\%$ volume per negara, misal China $-30\%$).
3. **Kegagalan Perpanjangan Izin Konsesi** (*License Cliff Drop*).
4. **Penyesuaian Parameter Diskonto & Biaya Variabel** (`discount_rate` dan `variable_cost_share` default $0.65$).
5. **Output**: Perhitungan ulang instan atas laba kotor, RBV pasca-shock, dan pergeseran peringkat emiten (*Rank Change*).

---

## 4. Batasan Metodologi & Disclaimer Hukum

> [!IMPORTANT]
> **DISCLAIMER RESMI:**
> Seluruh metrik, skor, estimasi valuasi berbasis cadangan (RBV), dan simulasi skenario yang dihasilkan oleh platform GALI disajikan secara eksklusif untuk tujuan informasi analitis, riset akademik, dan pemahaman operasional industri pertambangan.
> 
> GALI **BUKAN** merupakan lembaga penasihat investasi berlisensi, dan konten dalam platform ini **TIDAK** dapat ditafsirkan sebagai rekomendasi, tawaran, atau ajakan untuk membeli, menjual, atau memegang efek saham manapun di Bursa Efek Indonesia (IDX). Keputusan investasi sepenuhnya merupakan tanggung jawab independen pengguna.
