import "server-only";
import { createPrivateKey, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AiError, type AiStatus } from "../types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
type Environment = Record<string, string | undefined>;
export interface GeminiConfig {
  project: string;
  location: string;
  model: string;
  fingerprint: string;
  credentials?: { client_email: string; private_key: string; project_id: string };
}

function invalid(message: string): never { throw new AiError(message, "AI_CONFIGURATION", 503); }

export async function loadGeminiConfig(env: Environment = process.env, cwd = process.cwd()): Promise<GeminiConfig> {
  if (env.GALI_AI_ENABLED === "0" || env.GALI_AI_ENABLED === "false") {
    throw new AiError("AI analysis is disabled on this server. Data analysis remains available.", "AI_NOT_CONFIGURED", 503);
  }
  const location = env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
  const model = env.GALI_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  if (!/^(global|[a-z][a-z0-9-]{1,40})$/.test(location) || !/^gemini-[a-z0-9.-]{1,100}$/.test(model)) {
    invalid("The AI model or location setting is invalid. Check the server configuration.");
  }
  const filename = env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const inline = env.GALI_AI_SERVICE_ACCOUNT_JSON?.trim();
  if (filename && inline) invalid("Choose one service account source: a credentials file or a server secret.");
  let credentials: GeminiConfig["credentials"];
  if (filename || inline) {
    let raw: unknown;
    try {
      const text = inline ?? await readFile(path.resolve(cwd, filename!), "utf8");
      if (Buffer.byteLength(text, "utf8") > 32_768) invalid("The service account file is too large. Check the server credentials.");
      raw = JSON.parse(text);
    } catch (error) {
      if (error instanceof AiError) throw error;
      invalid("The service account JSON could not be read. Check its server-side path and JSON format.");
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("The credentials must be a Google service account JSON object.");
    const account = raw as Record<string, unknown>;
    if (account.type !== "service_account" || typeof account.client_email !== "string" || !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(account.client_email)
      || typeof account.private_key !== "string" || typeof account.project_id !== "string") {
      invalid("The JSON is missing valid service account fields. Use a Google Cloud service account key.");
    }
    try {
      const key = createPrivateKey(account.private_key);
      if (key.asymmetricKeyType !== "rsa") invalid("The service account private key must be a valid RSA key.");
    } catch { invalid("The service account private key is invalid. Check the server credentials."); }
    // Only Google's expected key fields enter the SDK. Custom token URLs are not used.
    credentials = { client_email: account.client_email, private_key: account.private_key, project_id: account.project_id };
  } else if (env.GALI_AI_USE_ADC !== "1" && env.GALI_AI_USE_ADC !== "true") {
    throw new AiError("AI analysis is not configured. Add service account credentials on the server to enable AI analysis.", "AI_NOT_CONFIGURED", 503);
  }
  const project = env.GOOGLE_CLOUD_PROJECT?.trim() || credentials?.project_id;
  if (!project || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) {
    invalid("Set a valid GOOGLE_CLOUD_PROJECT, or use the project ID from your service account JSON.");
  }
  const fingerprint = createHash("sha256").update(JSON.stringify({ project, location, model, credentials, adc: !credentials })).digest("hex");
  return { project, location, model, credentials, fingerprint };
}

const processState = globalThis as typeof globalThis & { __galiGeminiVerification?: { fingerprint: string; at: string } };
export function recordVerification(config: GeminiConfig) { processState.__galiGeminiVerification = { fingerprint: config.fingerprint, at: new Date().toISOString() }; }
export async function geminiStatus(): Promise<AiStatus> {
  const base = { model: process.env.GALI_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL, location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global", last_verified_at: null };
  try {
    const config = await loadGeminiConfig();
    const verification = processState.__galiGeminiVerification;
    const at = verification?.fingerprint === config.fingerprint ? verification.at : null;
    return { ...base, state: at ? "verified" : "configured", last_verified_at: at,
      message: at ? "AI access was verified on this server. Each analysis reads the active dataset." : "Credentials are configured. Test the connection or run an analysis to verify access." };
  } catch (error) {
    if (error instanceof AiError) return { ...base, state: error.code === "AI_NOT_CONFIGURED" ? "not_configured" : "configuration_error", message: error.message };
    return { ...base, state: "configuration_error", message: "AI configuration could not be checked." };
  }
}
