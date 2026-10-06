import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-line bg-brand-soft">
        <Compass className="h-7 w-7 text-brand" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        The page you are looking for does not exist — or the issuer symbol you meant may be outside the
        in-scope universe (see <code className="text-ink-soft">/coverage</code> for the full list).
      </p>
      <Link
        href="/"
        className="mt-8 flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-gold"
      >
        <Home className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
