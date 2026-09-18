"use client";

import { cn } from "@/lib/utils";

interface RetroGridProps {
  className?: string;
  angle?: number;
  gridColor?: string;
}

export function RetroGrid({
  className,
  angle = 65,
  gridColor = "rgba(245, 158, 11, 0.12)",
}: RetroGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden opacity-40 [perspective:200px]",
        className
      )}
      style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
    >
      {/* 3D Perspective Plane */}
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className="animate-grid-drift -inset-[100%] absolute h-[300%] w-[600%] [margin-left:-200%]"
          style={{
            backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 0), linear-gradient(to bottom, ${gridColor} 1px, transparent 0)`,
            backgroundSize: "60px 60px",
            backgroundRepeat: "repeat",
            transformOrigin: "100% 0 0",
          }}
        />
      </div>

      {/* Soft gradient masks to blend into dark background */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060911] via-transparent to-transparent" />
    </div>
  );
}

