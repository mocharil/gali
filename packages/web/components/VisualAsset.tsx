import Image from "next/image";

export const VISUAL_ASSETS = {
  "mine-cutaway": [1536, 1024],
  "reserve-value": [1024, 1024],
  "reserve-clock": [1024, 1024],
  "coal-tonne": [1024, 1024],
  "license-window": [1024, 1024],
  "export-containers": [1024, 1024],
  "scenario-drivers": [1536, 1024],
  "site-operation": [1536, 1024],
  "valuation-lenses": [1536, 1024],
  "data-modules": [1536, 1024],
  "evidence-desk": [1536, 1024],
} as const;

export type VisualAssetName = keyof typeof VISUAL_ASSETS;

export function VisualAsset({
  name, className = "", alt = "", priority = false,
}: {
  name: VisualAssetName;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const [width, height] = VISUAL_ASSETS[name];
  return <span className={`gali-art ${className}`} data-visual-asset={name} aria-hidden={alt ? undefined : true}>
    <Image src={`/visuals/${name}.webp`} alt={alt} width={width} height={height}
      sizes="(max-width: 639px) 92vw, (max-width: 1279px) 50vw, 620px"
      quality={85} priority={priority} />
  </span>;
}
