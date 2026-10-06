import type { ScenarioShockRequest } from "../types";

export interface AiRequest {
  mode: "chat" | "brief";
  question: string;
  symbols?: string[];
  scenario?: ScenarioShockRequest;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface AiEvidence {
  id: string;
  label: string;
  value: string;
  raw_value: number | string | boolean | null;
  href: string;
  source: string;
  as_of: string | null;
  run_id: string | null;
  quality: "complete" | "provisional" | "partial" | "methodology";
}

export interface AiClaim { text: string; evidence_ids: string[] }
export interface AiFinding extends AiClaim {
  kind: "finding" | "risk" | "limitation" | "next_step";
  title: string;
}

export interface AiNarrative {
  status: "answered" | "insufficient_data" | "out_of_scope";
  title: string;
  summary: AiClaim;
  findings: AiFinding[];
  follow_up_questions: string[];
}

export interface AiAnswer extends AiNarrative {
  request_id: string;
  provider: "gemini_vertex";
  model: string;
  generated_at: string;
  cached: boolean;
  evidence: AiEvidence[];
  snapshot: { as_of: string | null; run_id: string | null; source_type: string; scope: string[] };
  usage: { input_tokens: number | null; output_tokens: number | null };
}

export interface AiStatus {
  state: "not_configured" | "configured" | "verified" | "configuration_error";
  message: string;
  model: string;
  location: string;
  last_verified_at: string | null;
}

export class AiError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number, public readonly retryAfter?: number) {
    super(message);
    this.name = "AiError";
  }
}
