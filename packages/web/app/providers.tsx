"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DatasetContext, type DatasetStatus } from "@/components/DatasetContext";

export function Providers({ children, dataset }: { children: React.ReactNode; dataset: DatasetStatus }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  return <DatasetContext.Provider value={dataset}><QueryClientProvider client={client}>{children}</QueryClientProvider></DatasetContext.Provider>;
}
