export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/60 ${className}`} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`glass-card animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/40 ${className}`} />;
}
