"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useHydrated } from "./useHydrated";

/** Each consumer keeps the server snapshot until its own hydration completes.
 * A fast Sidebar request must not change a later-hydrated page's initial HTML. */
export function useIssuerUniverse(enabled = true) {
  const hydrated = useHydrated();
  const query = useQuery({ queryKey: ["issuers"], queryFn: api.getIssuers, enabled: hydrated && enabled });
  return {
    ...query,
    data: hydrated ? query.data : undefined,
    error: hydrated ? query.error : null,
    isLoading: !hydrated || query.isLoading,
    isError: hydrated && query.isError,
  };
}
