import "server-only";
import { AiError } from "../types";

/** Bounds billable calls for the local app and each server process. */
export class AiBudget {
  private calls: number[] = [];
  private active = 0;
  constructor(private readonly now: () => number = Date.now, private readonly perMinute = 10, private readonly perHour = 60, private readonly concurrency = 2) {}
  async run<T>(work: () => Promise<T>): Promise<T> {
    const now = this.now();
    this.calls = this.calls.filter((time) => time > now - 3_600_000);
    if (this.active >= this.concurrency) throw new AiError("Two AI requests are already running. Wait for an analysis to finish and try again.", "AI_BUSY", 429, 10);
    if (this.calls.length >= this.perHour || this.calls.filter((time) => time > now - 60_000).length >= this.perMinute) {
      throw new AiError("GALI's AI request allowance has been reached. Wait before requesting another analysis.", "AI_RATE_LIMIT", 429, this.calls.length >= this.perHour ? 3600 : 60);
    }
    this.calls.push(now); this.active++;
    try { return await work(); } finally { this.active--; }
  }
}
const processState = globalThis as typeof globalThis & { __galiAiBudget?: AiBudget };
export const aiBudget = processState.__galiAiBudget ??= new AiBudget();
