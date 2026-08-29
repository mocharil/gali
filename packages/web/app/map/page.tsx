import { MiningSitesMap } from "@/components/MiningSitesMap";

export const metadata = {
  title: "Peta Nasional Situs Tambang — GALI",
};

export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Peta Nasional Situs Tambang</h1>
        <p className="mt-1 text-sm text-slate-400">
          Setiap titik adalah satu konsesi tambang nyata dengan koordinat terverifikasi, ditautkan ke
          emiten IDX lewat pohon kepemilikan. Ukuran titik ≈ volume produksi tahunan; warna = komoditas.
        </p>
      </div>
      <MiningSitesMap className="h-[70vh]" />
    </div>
  );
}
