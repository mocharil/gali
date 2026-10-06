"use client";

import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

/** Critical financial values are readable on the first paint, including reduced motion. */
export function NumberTicker({ value, className, decimalPlaces = 0, prefix = "", suffix = "" }: NumberTickerProps) {
  return <span className={cn("inline-block tabular-nums", className)}>{prefix}{value.toLocaleString("en-US", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}{suffix}</span>;
}
