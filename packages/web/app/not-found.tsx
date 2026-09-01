import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
        <Compass className="h-7 w-7 text-amber-400" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-white">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Halaman yang Anda cari tidak ada — atau mungkin simbol emiten yang dimaksud di luar in-scope
        universe (lihat <code className="text-slate-300">/coverage</code> untuk daftar lengkap).
      </p>
      <Link
        href="/"
        className="mt-8 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
      >
        <Home className="h-4 w-4" />
        Kembali ke beranda
      </Link>
    </div>
  );
}
