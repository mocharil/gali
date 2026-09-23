"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number; // delay in seconds
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 45,
    stiffness: 90,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, value, direction]);

  // The span's text is owned entirely by this effect (including the initial
  // paint) so it never conflicts with React's own reconciliation -- rendering
  // static JSX children *and* mutating textContent imperatively caused the
  // two to coexist as duplicate text nodes after any re-render.
  useEffect(() => {
    const format = (n: number) =>
      `${prefix}${n.toLocaleString("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })}${suffix}`;
    if (ref.current) {
      ref.current.textContent = format(motionValue.get());
    }
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = format(latest);
      }
    });
  }, [springValue, motionValue, decimalPlaces, prefix, suffix]);

  return <span className={cn("inline-block tabular-nums", className)} ref={ref} />;
}

