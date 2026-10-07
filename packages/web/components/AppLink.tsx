"use client";

import NextLink, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { useActivity, useActivityFlag, routeLabel } from "./ActivityProvider";

type Props = React.ComponentProps<typeof NextLink> & { showPending?: boolean };

function LinkActivity({ href, showPending }: { href: Props["href"]; showPending: boolean }) {
  const { pending: linkPending } = useLinkStatus();
  const { destination } = useActivity();
  const path = typeof href === "string" ? href : href.pathname ?? "";
  const pending = linkPending || destination === path;
  useActivityFlag(linkPending, `Opening ${routeLabel(path)}…`, "navigation");
  return pending && showPending ? <Loader2 aria-hidden="true" data-testid="link-pending" className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" /> : null;
}

// Next filters modified, external and download clicks before onNavigate.
// Keep the transition at the root so closing the source menu cannot lose it.
export function AppLink({ children, showPending = false, ...props }: Props) {
  const { navigate } = useActivity();
  return <NextLink {...props} onNavigate={(event) => {
    let cancelled = false;
    props.onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
    if (cancelled || typeof props.href !== "string") return;
    const href = typeof props.as === "string" ? props.as : props.href;
    if (new URL(href, window.location.href).href === window.location.href) return;
    event.preventDefault();
    navigate(href, { replace: props.replace, scroll: props.scroll });
  }}>{children}<LinkActivity href={props.as ?? props.href} showPending={showPending} /></NextLink>;
}
