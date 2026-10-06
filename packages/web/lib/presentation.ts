/** English presentation of human-readable source labels. Numeric values and API codes stay intact. */
const SOURCE_TEXT: Record<string, string> = {
  "Dataset simulasi": "Simulation dataset",
  "Angka sintetis untuk demonstrasi alur analitik, bukan laporan aktual emiten. Semua metrik diturunkan dari input ini menggunakan mesin gali_core.": "Synthetic figures for demonstrating the analytical workflow, rather than actual issuer reports. All metrics are derived from these inputs using the gali_core engine.",
  "Cadangan panjang dan biaya kompetitif": "Long reserve life and competitive costs",
  "Harga premium dengan konsentrasi tujuan penjualan": "Premium prices with concentrated sales destinations",
  "Profil biaya, cadangan, dan ekspor seimbang": "Balanced cost, reserve, and export profile",
  "Volume besar dengan bantalan margin tipis": "High volume with a thin margin cushion",
  "Biaya rendah dengan premi kapitalisasi pasar": "Low costs with a market capitalization premium",
  "Margin kuat dengan masa berlaku izin terkonsentrasi": "Strong margins with concentrated license expiry dates",
  "Konsentrasi ekspor rendah dan izin jangka panjang": "Low export concentration and long-term licenses",
  "Cadangan panjang; rincian finansial belum tersedia": "Long reserve life; financial breakdown unavailable",
  "Rincian cadangan belum tersedia; biaya tetap dapat dianalisis": "Reserve breakdown unavailable; costs can still be analyzed",
  "Kalimantan Selatan": "South Kalimantan",
  "Kalimantan Tengah": "Central Kalimantan",
  "Kalimantan Timur": "East Kalimantan",
  "Kalimantan Barat": "West Kalimantan",
  "Kalimantan Utara": "North Kalimantan",
  "Sumatera Selatan": "South Sumatra",
  "Sumatra Selatan": "South Sumatra",
  "Sumatera Utara": "North Sumatra",
  "Sumatra Utara": "North Sumatra",
  "Sumatera Barat": "West Sumatra",
  "Sumatra Barat": "West Sumatra",
  "Jawa Barat": "West Java",
  "Jawa Tengah": "Central Java",
  "Jawa Timur": "East Java",
  "Sulawesi Selatan": "South Sulawesi",
  "Sulawesi Tengah": "Central Sulawesi",
  "Sulawesi Tenggara": "Southeast Sulawesi",
  "Sulawesi Utara": "North Sulawesi",
  "Nusa Tenggara Barat": "West Nusa Tenggara",
  "Nusa Tenggara Timur": "East Nusa Tenggara",
  "Papua Barat": "West Papua",
  "Cadangan dan produksi": "Reserves and production",
  "Pendapatan dan biaya": "Revenue and costs",
  "Lokasi dengan koordinat": "Sites with coordinates",
  "Tujuan penjualan": "Sales destinations",
  "Tanggal kontrak": "Contract dates",
  "Metrik utama lengkap": "Complete core metrics",
  "Satu profil sengaja tidak memiliki data cadangan; RLI dan RBV tetap kosong.": "One profile deliberately has no reserve data; RLI and RBV remain empty.",
  "Satu profil sengaja tidak memiliki finansial; biaya dan RBV tidak diestimasi.": "One profile deliberately has no financial data; costs and RBV are not estimated.",
  "Dua operator per emiten dengan kepemilikan 100% dan 75%.": "Two operators per issuer, with 100% and 75% ownership.",
  "Koordinat sintetis dalam koridor Indonesia untuk uji peta dan penelusuran emiten.": "Synthetic coordinates within Indonesian corridors for map testing and issuer exploration.",
  "Porsi volume per negara berjumlah 100% untuk tiap profil.": "Country volume shares total 100% for each profile.",
  "Satu tanggal akhir kontrak tidak tersedia; tidak dianggap berisiko nol.": "One contract end date is unavailable; its risk is not treated as zero.",
  "Kelengkapan RLI, RBV, dan cash cost dihitung dari field yang tersedia.": "RLI, RBV, and cash cost completeness is calculated from available fields.",
};

export function englishText(value: string): string {
  return SOURCE_TEXT[value] ?? value
    .replace(/\bPortofolio batubara\b/g, "Coal portfolio")
    .replace(/^Blok /, "Block ")
    .replace(/^Izin (\d+)(?= ·)/, "License $1")
    .replace(/^Koridor ([A-Z0-9]+) Utama$/, "$1 Main Corridor")
    .replace(/^Koridor ([A-Z0-9]+) Timur$/, "$1 East Corridor")
    .replace(/^Kontraktor Koridor (\d+)$/, "Corridor Contractor $1")
    .replace(/^Portofolio ([A-Z0-9]+)$/, "$1 Portfolio")
    .replace(/^(\d+) emiten · (\d+) lengkap · (\d+) parsial$/, "$1 issuers · $2 complete · $3 partial");
}

/** Translate a presentation copy; preserve identifiers, enum values, nulls, and calculations. */
export function englishDataset<T>(input: T): T {
  if (typeof input === "string") return englishText(input) as T;
  if (Array.isArray(input)) return input.map((item) => englishDataset(item)) as T;
  if (input !== null && typeof input === "object") {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, englishDataset(value)])) as T;
  }
  return input;
}

export function qualityLabel(value: string | null | undefined): string {
  return value === "LENGKAP" ? "Complete" : value === "PARSIAL" ? "Partial" : value || "Unavailable";
}
