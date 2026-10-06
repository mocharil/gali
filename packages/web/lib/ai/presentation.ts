export const AI_KIND_LABELS = {
  finding: "Finding",
  risk: "Risk to investigate",
  limitation: "Analytical limit",
  next_step: "Next research step",
} as const;

export const AI_STATUS_LABELS = {
  answered: "Answered with available evidence",
  insufficient_data: "Insufficient data",
  out_of_scope: "Outside dataset scope",
} as const;

export const AI_METHOD_LABELS: Record<string, string> = {
  reserve_life: "Reserve life assumptions",
  rbv: "RBV model boundaries",
  score: "Score eligibility and coverage",
  license: "License expiry exposure",
  destination: "Destination volume exposure",
  scenario: "Scenario operating mechanics",
  attribution: "Driver attribution order",
  sensitivity: "Sensitivity assumptions",
  ownership: "Ownership and aggregation",
  scope: "Dataset and research scope",
};

export const AI_QUALITY_LABELS = {
  complete: "Complete coverage",
  provisional: "Provisional",
  partial: "Partial coverage",
  methodology: "Model method",
} as const;
