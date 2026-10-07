"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const ISSUER_METADATA: Record<
  string,
  {
    name: string;
    shortName: string;
    logo: string;
    accentColor: string;
    isSvg?: boolean;
  }
> = {
  AADI: {
    name: "Adaro Andalan Indonesia",
    shortName: "Adaro Andalan",
    logo: "/AADI.png",
    accentColor: "#0f766e",
  },
  ADMR: {
    name: "Adaro Minerals Indonesia",
    shortName: "Adaro Minerals",
    logo: "/ADMR.png",
    accentColor: "#0284c7",
  },
  ADRO: {
    name: "Adaro Energy Indonesia",
    shortName: "Adaro Energy",
    logo: "/ADRO.png",
    accentColor: "#059669",
  },
  BUMI: {
    name: "Bumi Resources",
    shortName: "Bumi Resources",
    logo: "/BUMI.png",
    accentColor: "#b45309",
  },
  BYAN: {
    name: "Bayan Resources",
    shortName: "Bayan Resources",
    logo: "/BYAN.png",
    accentColor: "#0284c7",
  },
  DSSA: {
    name: "Dian Swastatika Sentosa",
    shortName: "Dian Swastatika",
    logo: "/DSSA.png",
    accentColor: "#dc2626",
  },
  GEMS: {
    name: "Golden Energy Mines",
    shortName: "Golden Energy",
    logo: "/GEMS.png",
    accentColor: "#ca8a04",
  },
  ITMG: {
    name: "Indo Tambangraya Megah",
    shortName: "Indo Tambangraya",
    logo: "/ITMG.webp",
    accentColor: "#2563eb",
  },
  PTBA: {
    name: "Bukit Asam",
    shortName: "Bukit Asam",
    logo: "/PTBA.png",
    accentColor: "#1d4ed8",
  },
};

export type IssuerLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CONFIG: Record<
  IssuerLogoSize,
  {
    container: string;
    padding: string;
    imgWidth: number;
    imgHeight: number;
    textSize: string;
    radius: string;
  }
> = {
  xs: {
    container: "h-5 w-5 min-w-5",
    padding: "p-0.5",
    imgWidth: 20,
    imgHeight: 20,
    textSize: "text-[9px]",
    radius: "rounded-md",
  },
  sm: {
    container: "h-7 w-7 min-w-7",
    padding: "p-1",
    imgWidth: 28,
    imgHeight: 28,
    textSize: "text-[11px]",
    radius: "rounded-lg",
  },
  md: {
    container: "h-10 w-10 min-w-10",
    padding: "p-1.5",
    imgWidth: 40,
    imgHeight: 40,
    textSize: "text-xs",
    radius: "rounded-xl",
  },
  lg: {
    container: "h-12 w-12 min-w-12",
    padding: "p-2",
    imgWidth: 48,
    imgHeight: 48,
    textSize: "text-sm",
    radius: "rounded-xl",
  },
  xl: {
    container: "h-16 w-16 min-w-16 sm:h-20 sm:w-20 sm:min-w-20",
    padding: "p-2.5",
    imgWidth: 80,
    imgHeight: 80,
    textSize: "text-base",
    radius: "rounded-2xl",
  },
};

export interface IssuerLogoProps {
  symbol?: string | null;
  size?: IssuerLogoSize;
  className?: string;
  alt?: string;
  showFallbackText?: boolean;
}

export function IssuerLogo({
  symbol,
  size = "md",
  className = "",
  alt,
  showFallbackText = true,
}: IssuerLogoProps) {
  const [hasError, setHasError] = useState(false);
  const sym = (symbol || "").trim().toUpperCase();
  const meta = ISSUER_METADATA[sym];
  const cfg = SIZE_CONFIG[size];

  // If no logo registered or image errored, display high-end monogram fallback
  if (!meta || hasError) {
    const letters = sym ? sym.slice(0, 2) : "??";
    return (
      <div
        className={cn(
          "inline-flex shrink-0 items-center justify-center border border-line bg-surface-muted font-numeric font-bold text-ink shadow-xs transition-colors",
          cfg.container,
          cfg.radius,
          cfg.textSize,
          className
        )}
        title={meta?.name || sym}
        aria-label={alt || `${sym} logo`}
      >
        {showFallbackText ? letters : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line/90 bg-white shadow-xs transition-all",
        cfg.container,
        cfg.padding,
        cfg.radius,
        className
      )}
      title={meta.name}
    >
      <Image
        src={meta.logo}
        alt={alt || `${meta.shortName} (${sym}) official logo`}
        width={cfg.imgWidth}
        height={cfg.imgHeight}
        unoptimized={meta.isSvg}
        className="h-full w-full object-contain transition-transform group-hover:scale-105"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function IssuerBadge({
  symbol,
  size = "sm",
  showName = false,
  className = "",
}: {
  symbol: string;
  size?: IssuerLogoSize;
  showName?: boolean;
  className?: string;
}) {
  const sym = symbol.trim().toUpperCase();
  const meta = ISSUER_METADATA[sym];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-xs transition-colors hover:border-brand-line",
        className
      )}
    >
      <IssuerLogo symbol={sym} size={size} />
      <span className="font-numeric font-bold">{sym}</span>
      {showName && meta && (
        <span className="text-[11px] font-normal text-muted truncate max-w-[120px]">
          {meta.shortName}
        </span>
      )}
    </span>
  );
}

