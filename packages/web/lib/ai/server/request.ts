import "server-only";
import { AiError, type AiRequest } from "../types";
import { InvalidScenario, parseScenarioRequest } from "../../simulation/scenario";

const invalid = (message: string): never => { throw new AiError(message, "AI_INVALID_REQUEST", 422); };
export function parseAiRequest(input: unknown): AiRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Send an analysis request object.");
  const object = input as Record<string, unknown>;
  if (Object.keys(object).some((key) => !["mode", "question", "symbols", "scenario", "history"].includes(key))) {
    invalid("Only a question, issuer selection, scenario parameters, and conversation history are accepted. GALI loads evidence on the server.");
  }
  if (object.mode !== "chat" && object.mode !== "brief") invalid("Choose chat or research brief mode.");
  if (typeof object.question !== "string" || !object.question.trim() || object.question.length > 1000) invalid("Enter a question between one and a thousand characters.");
  const containsKey = (text: string) => /-----BEGIN (?:RSA )?PRIVATE KEY-----|["']?private_key["']?\s*[:=]|AIza[A-Za-z0-9_-]{20,}/.test(text);
  if (containsKey(object.question as string)) invalid("Keep credentials on the server. Do not paste a private key into an analysis question.");
  let symbols: string[] | undefined;
  if (object.symbols !== undefined) {
    if (!Array.isArray(object.symbols) || object.symbols.length > 4 || object.symbols.some((symbol) => typeof symbol !== "string" || !/^[a-z0-9]{1,12}$/i.test(symbol))) invalid("Select up to four valid issuer tickers.");
    symbols = [...new Set((object.symbols as string[]).map((symbol) => symbol.toUpperCase()))];
  }
  let history: AiRequest["history"];
  if (object.history !== undefined) {
    if (!Array.isArray(object.history) || object.history.length > 6) invalid("Conversation history can contain up to six messages.");
    const messages = (object.history as unknown[]).map((message: unknown) => {
      if (!message || typeof message !== "object" || Array.isArray(message)) invalid("Invalid conversation history.");
      const item = message as Record<string, unknown>;
      if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string" || item.content.length > 1800
        || Object.keys(item).some((key) => !["role", "content"].includes(key))) invalid("Conversation messages require a user or assistant role and bounded text.");
      if (containsKey(item.content as string)) invalid("Conversation history cannot contain private credentials.");
      return { role: item.role as "user" | "assistant", content: item.content as string };
    });
    if (messages.reduce((sum, item) => sum + item.content.length, 0) > 6000) invalid("The conversation is too long. Start a new analysis.");
    history = messages;
  }
  let scenario: AiRequest["scenario"];
  if (object.scenario !== undefined) {
    if (!object.scenario || typeof object.scenario !== "object" || Array.isArray(object.scenario)
      || Object.keys(object.scenario).some((key) => !["price_shock_pct", "destination_shocks", "discount_rate", "variable_cost_share", "license_cliff_expiry_shock"].includes(key))) invalid("Only supported scenario parameters are accepted.");
    try { scenario = parseScenarioRequest(object.scenario); }
    catch (error) { if (error instanceof InvalidScenario) invalid(error.message); throw error; }
  }
  return { mode: object.mode as AiRequest["mode"], question: (object.question as string).trim(), ...(symbols?.length ? { symbols } : {}), ...(scenario ? { scenario } : {}), ...(history?.length ? { history } : {}) };
}
