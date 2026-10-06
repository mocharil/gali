import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "cyan" | "amber";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-line bg-surface-muted text-ink-soft",
    secondary: "border-line bg-surface-hover text-ink-soft",
    destructive: "border-negative-line bg-negative-soft text-negative",
    outline: "border-line-strong text-ink-soft",
    success: "border-positive-line bg-positive-soft text-positive font-numeric",
    warning: "border-brand-line bg-brand-soft text-brand font-numeric",
    cyan: "border-info-line bg-info-soft text-info font-numeric",
    amber: "border-brand-line bg-brand-soft text-brand",
  }[variant];

  return (
    <div
      className={cn(
        "gali-status border transition-colors",
        variantStyles,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
