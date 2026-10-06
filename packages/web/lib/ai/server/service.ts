import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { AiError, type AiAnswer, type AiRequest } from "../types";
import { loadGeminiConfig, type GeminiConfig } from "./config";
import { buildGroundingContext, type GroundingContext } from "./context";
import { generateWithGemini, type Generator } from "./provider";
import { narrativeSchema, SYSTEM_INSTRUCTION, validateNarrative } from "./narrative";
import { aiBudget } from "./budget";
import { withAiAbort } from "./abort";

interface Dependencies {
  config?: () => Promise<GeminiConfig>;
  context?: (request: AiRequest, signal: AbortSignal) => Promise<GroundingContext>;
  generate?: Generator;
  budget?: { run: <T>(work: () => Promise<T>) => Promise<T> };
}
const cache = new Map<string, { expires: number; answer: AiAnswer }>();

export async function analyzeWithGemini(request: AiRequest, signal: AbortSignal, dependencies: Dependencies = {}): Promise<AiAnswer> {
  const config = await (dependencies.config ?? loadGeminiConfig)();
  const context = await (dependencies.context ?? buildGroundingContext)(request, signal);
  if (signal.aborted) throw new AiError("The analysis was stopped.", "AI_ABORTED", 499);
  const key = createHash("sha256").update(JSON.stringify({ fingerprint: config.fingerprint, request, context })).digest("hex");
  const now = Date.now();
  for (const [id, value] of cache) if (value.expires <= now) cache.delete(id);
  const existing = cache.get(key);
  if (existing) return { ...existing.answer, request_id: randomUUID(), cached: true };
  const prompt = JSON.stringify({
    task: request.mode === "brief" ? "Write a balanced research brief with findings, counterarguments, limitations, and next research steps." : "Answer the research question with evidence and analytical limits.",
    question: request.question, conversation: request.history ?? [], snapshot: context.snapshot,
    evidence: context.evidence.map(({ id, label, value, quality }) => ({ id, label, value, quality })),
    deterministic_orderings: context.orderings, constraints: context.warnings,
  });
  const generate = dependencies.generate ?? generateWithGemini;
  const result = await (dependencies.budget ?? aiBudget).run(() => withAiAbort(() => generate(config, SYSTEM_INSTRUCTION, prompt, narrativeSchema(context), signal), signal));
  if (signal.aborted) throw new AiError("The analysis was stopped.", "AI_ABORTED", 499);
  const narrative = validateNarrative(result.text, context, request.mode === "brief");
  const cited = new Set([narrative.summary, ...narrative.findings].flatMap((claim) => claim.evidence_ids));
  const answer: AiAnswer = {
    ...narrative, request_id: randomUUID(), provider: "gemini_vertex", model: config.model, generated_at: new Date().toISOString(), cached: false,
    evidence: context.evidence.filter((item) => cited.has(item.id)), snapshot: context.snapshot,
    usage: { input_tokens: result.inputTokens, output_tokens: result.outputTokens },
  };
  while (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, { answer, expires: Date.now() + 300_000 });
  return answer;
}

export async function checkGeminiConnection(signal: AbortSignal): Promise<void> {
  const config = await loadGeminiConfig();
  const response = await aiBudget.run(() => withAiAbort(() => generateWithGemini(config, "Reply with exactly OK. No explanations.", "Connection check.", undefined, signal), signal));
  if (response.text.trim() !== "OK") throw new AiError("Gemini responded, but the connection check was incomplete. Try an analysis to verify model access.", "AI_INCOMPLETE", 502);
}
