"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "../useHydrated";
import { ai } from "./client";
import type { AiAnswer, AiRequest } from "./types";
import { useActivityFlag } from "@/components/ActivityProvider";

export function useAiStatus(enabled = true) {
  const hydrated = useHydrated();
  return useQuery({ queryKey: ["gemini-status"], queryFn: ({ signal }) => ai.status(signal), enabled: enabled && hydrated, staleTime: 10_000, retry: 0 });
}

export function useAiRequest() {
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useActivityFlag(busy, "Preparing AI analysis…", "analysis");
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const cancel = useCallback(() => { generation.current++; controller.current?.abort(); controller.current = null; setBusy(false); setError(null); }, []);
  const clear = useCallback(() => { cancel(); setAnswer(null); }, [cancel]);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);

  const ask = useCallback(async (input: AiRequest): Promise<AiAnswer | undefined> => {
    controller.current?.abort();
    const current = ++generation.current;
    const pending = new AbortController(); controller.current = pending;
    setBusy(true); setError(null); setAnswer(null);
    try {
      const result = await ai.analyze(input, pending.signal);
      if (current !== generation.current || pending.signal.aborted) return;
      setAnswer(result); return result;
    } catch (failure) {
      if (current !== generation.current || pending.signal.aborted) return;
      setError(failure instanceof Error && /timeout/i.test(failure.name) ? "The analysis timed out. Try again with a shorter question." : failure instanceof Error ? failure.message : "AI analysis could not be completed. Try again.");
    } finally {
      if (current === generation.current) { setBusy(false); controller.current = null; }
    }
  }, []);
  return { answer, error, busy, ask, cancel, clear };
}
