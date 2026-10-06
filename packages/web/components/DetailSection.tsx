import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function DetailSection({ title, description, children, className = "" }: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return <details className={`gali-card group/detail ${className}`}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
      <span><span className="block text-sm font-semibold text-ink">{title}</span>{description && <span className="mt-1 block text-[12px] text-muted">{description}</span>}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open/detail:rotate-180" aria-hidden="true" />
    </summary>
    <div className="border-t border-line p-5 sm:p-6">{children}</div>
  </details>;
}
