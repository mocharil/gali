export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-hover ${className}`} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`glass-card animate-pulse rounded-xl border border-line bg-surface ${className}`} />;
}
