"use client";

import React, { useState } from "react";
import { Sliders, ChevronDown, ChevronUp, Info } from "lucide-react";

export function AssumptionBar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-800/80 bg-slate-950/60 text-xs">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Baseline Assumptions:</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-300">
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Coal Benchmark: <strong className="text-amber-400 font-mono">$135.00/t</strong>
            </span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Real Discount Rate: <strong className="text-cyan-400 font-mono">12.0%</strong>
            </span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Variable Cost Share: <strong className="text-emerald-400 font-mono">65.0%</strong>
            </span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Min Match Confidence: <strong className="text-indigo-400 font-mono">0.72</strong>
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <span>{expanded ? "Hide Details" : "Assumption Details"}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-800/80 bg-slate-900/40 px-4 py-3 sm:px-6 lg:px-8 text-slate-300">
          <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-amber-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Commodity Reference
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Benchmark Newcastle 6,000 kcal/kg GAR FOB index reference for normalized coal revenue curves.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-cyan-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Real Discount Rate
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                12.0% annual real cost of capital hurdle used for Reserve-Backed Valuation (RBV) finite annuity formulas.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-emerald-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Variable Cost Share
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                65% variable operating cost assumption for export volume shock sensitivity and operating leverage.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-indigo-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Entity Matching
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Trigram similarity threshold of 0.72 for attributing unlinked IUP concession licenses to listed issuers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
