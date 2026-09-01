# GALI — Naskah Video Judging & Panduan Submission (Fase 8)

Dokumen ini berisi naskah lengkap judging video (3 menit), naskah video teaser (1 menit), draf postingan media sosial, serta format data submisi resmi untuk **Sectors Hackathon 2026 (Track 3: Market Intelligence)**.

---

## 🎬 1. Naskah Judging Video (Maksimal 3 Menit)

**Target Durasi:** 02:50 – 03:00  
**Lokasi Perekaman:** Wajib direkam langsung dari live production: [https://gali-web.vercel.app](https://gali-web.vercel.app)

---

### Segment 1: Kait Emosional & Kontras (00:00 – 00:25)
- **Visual:** Buka browser di halaman `/map`. Zoom-in ke situs tambang Tutupan di Kalimantan Selatan. Tampilkan tooltip informasi: koordinat `-2.15, 115.52`, kapasitas cadangan batubara ratusan juta ton.
- **Voiceover (VO):**
  > *"Ini Tambang Tutupan di Kalimantan Selatan. Lebih dari 40 juta ton batubara digali dari lubang ini setiap tahun. Tapi bagi sebagian besar investor di Bursa Efek Indonesia, tambang raksasa ini cuma disederhanakan menjadi empat huruf di layar ticker: A-D-R-O.*
  > *Masalahnya: grafik harga saham dan rasio PER tidak pernah memberi tahu kita kapan tambang fisik ini akan habis."*

---

### Segment 2: Problem Statement & Solusi GALI (00:25 – 00:55)
- **Visual:** Navigasi ke halaman utama `/` (Leaderboard). Sorot 3 metrik besar di atas (Total Attributable Reserves $50.6B, Weighted RLI 23.9 thn, High Risk License Cliff 11%).
- **Voiceover (VO):**
  > *"Perkenalkan GALI — Ground-truth Analytics for Listed Issuers. Kami membangun platform market intelligence pertama yang menilai emiten komoditas IDX dari aset fisik tambangnya, bukan sekadar riwayat pergerakan harganya.*
  > *GALI menggabungkan data izin tambang ESDM, koordinat GPS, kalori batubara, dan rantai kepemilikan korporasi bertingkat ke dalam satu angka komprehensif: Ground Truth Score."*

---

### Segment 3: Deep Dive Produk & Metrik Fundamental (00:55 – 01:50)
- **Visual 1:** Klik salah satu emiten, misalnya `/issuer/ADRO` atau `/issuer/BYAN`. Tampilkan kartu metrik:
  - **M1 Reserve Life Index (RLI)**: Sisa umur cadangan (contoh: 17 tahun aktual).
  - **M2 Reserve-Backed Value (RBV)**: Nilai diskonto laba cadangan fisik.
  - **M3 License Cliff**: Timeline izin IUP/IUPK yang akan kedaluwarsa.
  - **M4 Cumulative Cash Cost Curve**: Posisi cash cost per ton terhadap harga benchmark ICI-2 / ICI-4.
- **Visual 2:** Klik tombol **"Evidence & Provenance"** di pojok kartu metrik. Drawer terbuka ke kanan menampilkan JSON response Sectors API, `params_hash`, timestamp fetch, dan baris audit trail yang dapat diverifikasi independen.
- **Voiceover (VO):**
  > *"Di halaman detail emiten, investor dapat melihat Reserve Life Index: berapa tahun lagi produksi dapat bertahan sebelum cadangan habis total. Kita juga memetakan License Cliff—apakah izin tambang utama akan kedaluwarsa dalam 3 tahun ke depan.*
  > *Dan yang terpenting: setiap angka di GALI memiliki audit trail penuh. Dengan satu klik pada Evidence Drawer, Anda dapat melihat sumber data mentah Sectors API hingga ke baris respons aslinya. Tidak ada kotak hitam."*

---

### Segment 4: Scenario Studio & Live Simulation (01:50 – 02:30)
- **Visual:** Buka halaman `/scenario`.
  1. Tunjukkan baseline invariant 0.0% shock.
  2. Geser slider **Global Coal Price Shock** ke `-20%`. Tampilkan ranking emiten bergeser secara live, delta valuasi RBV turun, dan emiten berbiaya tinggi (high cash cost) tertekan paling parah.
  3. Buka halaman `/cost-curve` dan `/divergence` untuk melihat posisi kuadran valuasi pasar vs valuasi cadangan fisik.
- **Voiceover (VO):**
  > *"Melalui Scenario Studio, analis dan manajer investasi dapat menguji ketahanan portofolio secara real-time. Apa yang terjadi jika harga batubara global anjlok 20%? Atau jika tarif impor negara tujuan dinaikkan?*
  > *GALI menghitung ulang valuasi seluruh rantai anak usaha secara live di backend serverless kami, memberikan keunggulan analitis yang tidak dimiliki terminal pasar konvensional."*

---

### Segment 5: Arsitektur Teknik, Keamanan, & Penutup (02:30 – 03:00)
- **Visual:** Tampilkan diagram arsitektur [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md), pipeline Dagster harian di GitHub Actions, dan footer disclaimer investasi.
- **Voiceover (VO):**
  > *"Di balik layar, GALI ditenagai oleh PostgreSQL 16 dengan 6 skema terisolasi, resolusi graf kepemilikan transitif, caching Upstash Redis dengan latensi sub-100ms, serta automasi ingestion harian GitHub Actions dengan konsumsi kredit yang sangat efisien.*
  > *GALI: Gali lebih dalam dari kode sahamnya. Kunjungi kami di gali-web.vercel.app."*

---

## 📱 2. Naskah Teaser Media Sosial (60 Detik)

- **Durasi:** 00:55 – 01:00
- **Struktur:**
  - **(00:00–00:10)** Video cepat map zoom satelit tambang batubara -> teks: *"Tahukah Anda kapan cadangan tambang emiten batubara IDX Anda habis?"*
  - **(00:10–00:25)** Tampilan Leaderboard GALI & perbandingan RLI (Reserve Life Index).
  - **(00:25–00:45)** Demo Scenario Studio: Geser slider shock harga batubara, ranking valuasi bergerak live.
  - **(00:45–01:00)** Tampilan Evidence Drawer + CTA Link `gali-web.vercel.app`.

---

## 📢 3. Draf Publikasi Media Sosial

### Post LinkedIn:
```markdown
🚀 Memperkenalkan GALI (Ground-truth Analytics for Listed Issuers) — Entri kami untuk Sectors Hackathon 2026 (Track 3: Market Intelligence)!

Mayoritas analisis saham komoditas di Bursa Efek Indonesia berfokus pada grafik teknikal dan PER. Namun bagi perusahaan tambang, nilai fundamental sejatinya ditentukan oleh aset fisiknya: berapa sisa cadangan (reserves), berapa tahun umur tambang (Reserve Life Index), berapa estimasi cash cost per ton, dan kapan izin ESDM (IUP/IUPK) akan kedaluwarsa.

GALI hadir menjembatani data tambang fisik hulu dengan valuasi pasar modal IDX:
✨ Interactive Concession Map dengan koordinat GPS nyata
✨ M1–M9 Fundamental Mining Metrics (Reserve Life, Cash Cost Curve, License Cliff)
✨ Live Scenario Studio untuk stress-test harga komoditas dan tarif ekspor
✨ Full Data Provenance & Evidence Drawer untuk transparansi audit 100%

🌐 Coba langsung aplikasinya: https://gali-web.vercel.app
📚 Repositori & Dokumentasi: https://github.com/mocharil/gali
📖 Swagger API Docs: https://gali-api.vercel.app/docs

Terima kasih kepada Sectors (PT Kuadran Finansial Teknologi) atas penyediaan API infrastruktur data pasar modal Indonesia yang luar biasa!

#SectorsHackathon2026 #MarketIntelligence #IndonesianStockMarket #Fintech #DataAnalytics #IDX #CoalMining #FastAPI #NextJS
```

### Post Twitter / X:
```text
Mining stocks shouldn't be judged by ticker charts alone. ⛏️📊

Excited to launch GALI (Ground-truth Analytics for Listed Issuers) for @sectors_app Hackathon 2026 (Track 3)!

GALI maps physical coal concessions directly to IDX valuations:
🗺️ Interactive GPS Mine Map
⏳ Reserve Life Clock & License Cliff
📈 Live Scenario Studio Stress-Testing
🔍 100% Provenance Audit Trail

Live app: https://gali-web.vercel.app
Repo: https://github.com/mocharil/gali

#SectorsHackathon2026 #Fintech #IDX
```

---

## 📋 4. Metadata & Formulir Submisi Hackathon

| Kolom Submisi | Nilai / Konten Resmi |
|---|---|
| **Judul Proyek** | GALI (Ground-truth Analytics for Listed Issuers) |
| **Tagline** | *"Gali lebih dalam dari kode sahamnya."* |
| **Track Lomba** | **Track 3: Market Intelligence** |
| **Problem Statement (1 Kalimat)** | Investor pasar modal menilai emiten komoditas dari rasio keuangan statis dan sentimen berita tanpa pernah mengetahui umur cadangan fisik tambang (RLI), titik impas biaya tunai (cash cost breakeven), dan risiko masa berlaku izin konsesi ESDM. |
| **Live Web URL** | [https://gali-web.vercel.app](https://gali-web.vercel.app) |
| **API Base URL** | [https://gali-api.vercel.app](https://gali-api.vercel.app) |
| **GitHub Repository** | [https://github.com/mocharil/gali](https://github.com/mocharil/gali) |
| **Lisensi** | MIT License |
| **Data Source Utama** | Sectors API (`/v2/mining/*`, `/v2/companies/*`, `/v2/subsectors/*`) |
| **Credit Ledger Audit** | 405 / 1000 Kredit terpakai (Terdokumentasi penuh di `ops.credit_ledger`) |
