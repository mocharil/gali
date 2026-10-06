"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const element = ref.current;
    document.body.style.overflow = "hidden";
    const selectors = 'button:not(:disabled), a[href], input:not(:disabled), select, textarea, [tabindex="0"]';
    element.querySelector<HTMLElement>(selectors)?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = [...element.querySelectorAll<HTMLElement>(selectors)].filter((el) => el.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, ref]);
}
