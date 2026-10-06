# GALI Design System

Versi 0.3.0 · Adaptasi `ORGANA_MASTER_DESIGN_SYSTEM(1).md` untuk riset emiten pertambangan.

GALI memakai prinsip tata letak, tipografi, spacing, komponen, dan gerak dari Organa. Identitasnya tetap navy, amber, dan cyan. Hierarki informasi membantu pengguna membaca angka, menelusuri bukti, dan membandingkan risiko. Fitur organisasi, agen, office, dan palet violet Organa tidak menjadi bagian aplikasi GALI.

## Warna semantik

| Token | Warna | Peran |
|---|---|---|
| `canvas` | `#F7F8FA` | Latar workspace |
| `surface` | `#FFFFFF` | Kartu, tabel, navigasi, modal |
| `surface-muted` | `#F7F9FB` | Kelompok kontrol dan panel pendukung |
| `ink` | `#142337` | Navy GALI untuk judul dan angka utama |
| `ink-soft` | `#34445A` | Teks isi |
| `muted` | `#59697E` | Metadata dan label |
| `subtle` | `#657389` | Keterangan sekunder |
| `gold` | `#F5B431` | Aksen amber, CTA dan progress |
| `brand` | `#8B580C` | Teks amber dengan kontras pada permukaan terang |
| `brand-soft` | `#FFF6E3` | Navigasi terpilih dan konteks amber |
| `info` | `#087185` | Cyan GALI untuk informasi pendukung |
| `positive` | `#0D7461` | Hasil positif atau data siap |
| `negative` | `#AD3647` | Hasil negatif atau data tidak tersedia |
| `line` | `#E4E9EF` | Pemisah dan garis kartu |
| `chart-gold` | `#C68A1C` | Seri utama grafik |
| `chart-cyan` | `#087D94` | Seri pembanding |
| `chart-baseline` | `#ADBACB` | Baseline skenario |

Token ditetapkan di `packages/web/app/globals.css`. Gunakan nama peran, bukan warna Tailwind mentah pada halaman baru. Amber terang tidak digunakan sebagai teks kecil pada putih. Kartu biasa memakai permukaan solid. Blur hanya dipakai pada overlay dialog, bukan tabel riset.

## Tipografi

Plus Jakarta Sans variable, rentang 200–800, dibundel melalui `next/font/local`. Font berjalan tanpa Google Fonts atau request font eksternal. Sumber font: repository Google Fonts, `ofl/plusjakartasans`. Lisensi OFL disertakan di `packages/web/app/fonts/OFL.txt`.

| Elemen | Ukuran | Bobot | Ketentuan |
|---|---|---|---|
| Hero desktop | 64–68 px | 700 | Line-height 1,06; tracking −0,035 em |
| Hero ponsel | 40 px | 700 | Tetap dapat dibaca tanpa scrolling horizontal |
| Judul halaman | 30–36 px | 700 | Line-height sekitar 1,18 |
| Judul bagian | 20–24 px | 600–700 | Hindari kapital seluruh kalimat |
| Judul kartu | 16–18 px | 600 | Hierarki jelas terhadap metadata |
| Isi | 14–16 px | 400–500 | Line-height 1,5–1,65 |
| Metadata | 12–13 px | 400–600 | Kontras terhadap permukaan solid |
| Angka utama | 28–38 px | 600–650 | Tabular numerals, tetap memakai Jakarta |

`font-numeric` mengaktifkan angka tabular tanpa memberi kesan terminal. `font-mono` hanya untuk JSON dan konteks perhitungan. Nilai finansial tampil lengkap pada render pertama, tanpa count-up yang memperlihatkan angka sementara.

## Tata letak dan komponen

- Grid jarak 8 px, sela kartu 16–24 px. Workspace maksimal 1440 px.
- Padding desktop 32 px, tablet 24 px, ponsel 16 px.
- Sidebar 256 px, terlipat 72 px. Header 72 px. Navigasi aktif memakai latar amber lembut dan garis amber tipis.
- Radius kartu 20 px, hero dan modal 24 px, kontrol 12 px.
- Shadow lembut untuk pemisahan hierarki; tanpa border animasi atau glow neon.
- Tombol medium 40 px, small 32 px, large 48 px, CTA hero 56 px. Tombol shared minimal 44 px di ponsel.
- Input dan ikon aksi minimal 44 px di ponsel. Slider menyediakan bidang interaksi 44 px di ponsel.
- Ikon Lucide: navigasi 18 px, isi 16–20 px; tile ikon 40 px.
- Badge status berbentuk pill, 26 px. Warna status menyampaikan makna bersama teks.
- Tabel menggunakan heading netral, baris yang dipisahkan garis halus, dan scroll lokal untuk kolom lebar.
- Grafik memakai grid tipis, label 12 px, dan seri konsisten. Tooltip putih dengan teks navy.
- Peta lokal memakai permukaan air terang, daratan cyan redup, serta lokasi amber. Garis ke koordinat dan pemilihan keyboard tetap tersedia. Mode Sectors memakai basemap Positron OpenFreeMap.

## Gerak dan akses

Gerak UI berlangsung 180–220 ms. Transisi halaman 280 ms dengan `cubic-bezier(.22,1,.36,1)`, perpindahan kecil, dan tanpa efek gaming. `prefers-reduced-motion` menghentikan animasi dekoratif, gerak grafik radar/bar, dan scrolling otomatis. Pada preferensi normal, grafik memakai durasi 220 ms. Angka utama tidak bergantung pada animasi.

Focus ring tetap terlihat; dialog mempertahankan Escape, focus trap, dan pengembalian fokus. Tombol pencarian, asisten, drawer, serta sidebar terlipat memakai nama aksesibel. Status kegagalan, dataset parsial, dan asal data tetap tersaji jelas.

## Cakupan implementasi

Landing, dashboard, research brief, profil emiten, unit economics, peer comparison, Scenario Studio, cost curve, peta, divergence, coverage, metodologi, pencarian, asisten, evidence drawer, footer, dan ekspor tetap memakai alur data yang sama. Algoritme M1–M9, dataset, dan API tidak berubah karena adaptasi visual ini.

Screenshot hasil aplikasi tersedia di `docs/screenshots/`. Hasil pemeriksaan terakhir dicatat di `docs/DESIGN_VERIFICATION.md`.
