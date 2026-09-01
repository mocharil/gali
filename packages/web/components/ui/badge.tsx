import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "cyan" | "amber";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-slate-100 text-slate-900 shadow",
    secondary: "border-slate-800 bg-slate-800/80 text-slate-300",
    destructive: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    outline: "border-slate-700 text-slate-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-mono",
    amber: "border-amber-500/40 bg-amber-500/15 text-amber-300 font-mono shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none",
        variantStyles,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
