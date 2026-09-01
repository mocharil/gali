import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "amber" | "cyan";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-slate-100 text-slate-900 shadow hover:bg-slate-200 active:scale-[0.98]",
      destructive: "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40",
      outline: "border border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white shadow-sm",
      secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/50",
      ghost: "hover:bg-slate-800/80 hover:text-white text-slate-400",
      link: "text-amber-400 underline-offset-4 hover:underline p-0 h-auto",
      amber: "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:from-amber-400 hover:to-yellow-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98]",
      cyan: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50",
    }[variant];

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-xs",
      sm: "h-8 rounded-lg px-3 text-[11px]",
      xs: "h-7 rounded-md px-2 text-[10px]",
      lg: "h-11 rounded-xl px-6 text-sm font-semibold",
      icon: "h-9 w-9 p-0",
    }[size];

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
          variantStyles,
          sizeStyles,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
