import { MiningSitesMap } from "@/components/MiningSitesMap";
import { MapPin } from "lucide-react";


export const metadata = {
  title: "Mining map",
  description: "Mining sites from the active dataset and issuer ownership relationships.",
};

export default function MapPage() {
  return (
    <div className="gali-page space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-sm font-bold text-brand mb-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>Locations & ownership</span>
          </div>
          <h1 className="text-3xl font-bold text-ink">Explore locations and ownership.</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">
            Filter by issuer or province, then select a site to review its operator and coordinates.
            Coordinates do not represent license boundaries or field verification.
          </p>
        </div>
      </div>

      {/* Map Container */}
      <MiningSitesMap />
    </div>
  );
}
