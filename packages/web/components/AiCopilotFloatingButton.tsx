"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function AiCopilotFloatingButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <div className="fixed bottom-10 right-5 z-40 sm:bottom-6 sm:right-6">
      <button
        onClick={onClick}
        type="button"
        aria-label="Open GALI AI Copilot"
        className="group relative flex items-center gap-2.5 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 p-1.5 pl-3.5 pr-4 text-slate-950 font-black shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] active:scale-95 cursor-pointer"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-amber-400 shadow-inner group-hover:rotate-12 transition-transform">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-black tracking-wide leading-none">
            GALI AI Copilot
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-900/80 leading-tight">
            Ask Mining Intel ⌘J
          </span>
        </div>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
        </span>
      </button>
    </div>
  );
}
