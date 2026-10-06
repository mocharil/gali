import type { ReactNode } from "react";
import { VisualAsset, type VisualAssetName } from "@/components/VisualAsset";

export function VisualIntro({ asset, eyebrow, title, description, children, className = "" }: {
  asset: VisualAssetName;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}) {
  return <section className={`gali-visual-intro ${className}`}>
    <div className="min-w-0">
      <p className="gali-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-ink sm:text-[28px]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
    <VisualAsset name={asset} className="gali-intro-art" />
  </section>;
}
