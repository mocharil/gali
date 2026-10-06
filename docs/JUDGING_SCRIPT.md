# Demo GALI — Track 3: Market Intelligence

For GALI 0.5.0, configure and test Gemini before the presentation using [GEMINI_SETUP.md](GEMINI_SETUP.md). Demonstrate **Gemini analysis**, open its evidence references, and generate an AI research brief for an active scenario. The rule-based Assistant step below remains available as **Data analysis** when Gemini is not configured or cannot be reached. Introduce each mode accurately; a connection failure must not be presented as a successful AI answer.

Gunakan dataset Sectors yang telah dipublikasikan, bukan fixture pengujian. Cek `/ready`, lalu `/coverage` sebelum merekam. Jangan membaca angka dari naskah ini: sebutkan angka yang benar-benar tampil pada layar saat perekaman.

## Problem statement

GALI membantu analis emiten batubara IDX menghubungkan valuasi pasar dengan umur cadangan, biaya operasi, dan masa berlaku izin yang tersebar dalam data tambang Sectors.

## Walkthrough 3 menit

| Waktu | Layar dan tindakan | Narasi / hal yang diperhatikan |
|---|---|---|
| 0:00–0:20 | Landing → **Mulai analisis** | “Kode saham tidak menjelaskan kapan cadangan habis atau izin tambang berakhir. GALI menghubungkan aset fisik dengan data pasar untuk membantu riset.” |
| 0:20–0:50 | Dashboard → profil emiten lengkap | Tunjukkan RLI, RBV, biaya, dan label kualitas data. Jelaskan bahwa RBV adalah model laba kotor dan umur cadangan, bukan target harga saham. |
| 0:50–1:15 | **Evidence & Provenance** | Buka asumsi, periode input, alasan nilai kosong, serta ID sumber. Drawer menampilkan konteks perhitungan dan referensi, bukan raw payload atau lineage per kolom yang lengkap. |
| 1:15–1:45 | Peer Comparison | Bandingkan dua emiten yang memiliki data biaya dan cadangan. Radar memakai lima pilar yang tersedia. Beralih ke PTBA untuk menunjukkan bahwa data parsial tidak diberi angka nol palsu. |
| 1:45–2:20 | Scenario Studio → **Harga −25%** → **Reset** | Ini momen utama: lihat perubahan RBV dan peringkat secara deterministik. Nilai persen mengikuti respons API. Saat input pendapatan/biaya tidak tersedia, tabel menyebut proksi laba kotor. Reset kembali ke delta nol. |
| 2:20–2:40 | Asisten Data | Masukkan “Bandingkan BUMI dan BYAN”. Asisten merangkum fakta API dengan aturan yang transparan; tidak menggunakan LLM. Jangan menyebutnya GenAI. |
| 2:40–3:00 | Coverage | Tunjukkan cakupan GPS, kelengkapan, dan ledger aktual. Tutup dengan manfaat: riset lebih mudah ditelusuri tanpa menyamakan data yang tidak tersedia dengan risiko nol. |

Peta adalah alur pendukung: buka lokasi yang tersedia, kemudian profil emiten yang terhubung. Hubungan lokasi dapat mencakup lebih dari satu emiten. Jika basemap atau WebGL gagal, gunakan daftar lokasi. Jangan mengklaim koordinat telah diverifikasi di lapangan.

## Teaser 1 menit

0–15 detik: masalah dan landing. 15–30 detik: dashboard dan satu profil. 30–50 detik: preset harga −25% lalu Reset. 50–60 detik: Evidence / Coverage dan problem statement. Gunakan rekaman produk yang benar-benar berjalan.

## Verifikasi akhir

Jalankan build, tes backend, dan E2E dengan database pengujian terpisah; lalu lakukan smoke test dataset Sectors aktual. Pastikan baseline skenario menghasilkan delta nol dan CSV sesuai layar. Jangan menampilkan fixture QA sebagai data pasar.

Lihat [laporan audit](DEMO_AUDIT.md) bagian Remaining Issues dan Demo Risk Checklist untuk syarat submission dan risiko yang belum terverifikasi.

Sumber resmi, diperiksa 5 Oktober 2026: [Rules](https://hackathon.sectors.app/rules) dan [Market Intelligence](https://hackathon.sectors.app/tracks/market-intelligence).
