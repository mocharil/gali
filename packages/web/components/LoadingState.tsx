import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading this view…", description, skeleton = false, className = "" }: {
  label?: string; description?: string; skeleton?: boolean; className?: string;
}) {
  return <div role="status" aria-live="polite" aria-busy="true" className={`min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`} data-testid="loading-state">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-info-soft p-2 text-info"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-semibold text-ink">{label}</p><p className="mt-1 text-[12px] leading-relaxed text-muted">{description ?? "Preparing the data and visualizations for this view."}</p></div></div>
    {skeleton && <div className="mt-6 space-y-4" aria-hidden="true"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="skeleton h-24 rounded-2xl" />)}</div><div className="skeleton h-48 rounded-2xl" /><div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="skeleton h-4 w-full rounded-lg" />)}</div></div>}
  </div>;
}

export function PageLoading({ label }: { label: string }) {
  return <div className="gali-page"><LoadingState label={label} skeleton /></div>;
}
