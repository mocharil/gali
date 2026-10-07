import "server-only";
import { AiError } from "../types";

/** Also bounds authentication, which can finish before the SDK starts its fetch. */
export function withAiAbort<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const error = () => signal.reason instanceof Error && signal.reason.name === "TimeoutError"
      ? new AiError("The AI request timed out. Try again when the connection is stable.", "AI_TIMEOUT", 504)
      : new AiError("The analysis was stopped.", "AI_ABORTED", 499);
    const abort = () => { signal.removeEventListener("abort", abort); reject(error()); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => { if (signal.aborted) throw error(); return work(); }).then(
      (value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (failure) => { signal.removeEventListener("abort", abort); reject(failure); },
    );
  });
}
