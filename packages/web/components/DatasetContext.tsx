"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

export interface DatasetStatus { mode: "simulation" | "sectors"; as_of: string | null; version: string | null; source_type: "synthetic" | "sectors" }
export const DatasetContext = createContext<DatasetStatus>({ mode: "sectors", as_of: null, version: null, source_type: "sectors" });
export const useDataset = () => useContext(DatasetContext);

export function DatasetNotice() {
  const dataset = useDataset();
  if (dataset.mode !== "simulation") return null;
  return <div className="gali-data-notice px-4 py-2 sm:px-6 lg:px-8" data-testid="dataset-origin">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
      <Link href="/coverage#dataset-origin" className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-info"><Layers className="h-3.5 w-3.5" />Simulation dataset</Link>
      <span>Snapshot {dataset.as_of} · Synthetic figures, calculated metrics.</span>
      <Link href="/coverage#dataset-origin" className="ml-auto hidden text-info hover:underline sm:inline">Source details →</Link>
    </div>
  </div>;
}
