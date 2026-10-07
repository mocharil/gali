"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useActivity } from "@/components/ActivityProvider";

export function useActionFeedback() {
  const { begin } = useActivity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const running = useRef(false);
  const mounted = useRef(false);
  const finish = useRef<(() => void) | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; finish.current?.(); };
  }, []);
  const run = useCallback(async (label: string, work: () => unknown | Promise<unknown>, paintFirst = false) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(false);
    const done = begin(label); finish.current = done;
    try {
      // Let the browser display file-preparation feedback before serialization.
      if (paintFirst) await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      if (!mounted.current) return;
      await work();
    } catch { if (mounted.current) setError(true); }
    finally {
      done(); finish.current = null; running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [begin]);
  return { busy, error, run };
}
