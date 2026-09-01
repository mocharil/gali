import { MiningSitesMap } from "@/components/MiningSitesMap";
import { MapPin } from "lucide-react";


export const metadata = {
  title: "Peta Nasional Situs Tambang",
  description: "Sebaran geografis 52 konsesi tambang batubara dan nikel berkoordinat GPS terverifikasi.",
};

export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 mb-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>M1 Geographic Asset Ground Truth</span>
          </div>
          <h1 className="text-3xl font-black text-white">Peta Nasional Konsesi Tambang</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Setiap titik merepresentasikan konsesi tambang fisik nyata dengan koordinat GPS terverifikasi,
            dihubungkan ke emiten induk di Bursa Efek Indonesia melalui pohon kepemilikan efektif.
            Ukuran lingkaran sebanding dengan volume produksi tahunan (Mt/thn).
          </p>
        </div>
      </div>

      {/* Map Container */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-2 shadow-2xl backdrop-blur-2xl">
        <MiningSitesMap className="h-[74vh]" />
      </div>
    </div>
  );
}
