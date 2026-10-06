/** Display legacy runs with the same neutral interpretation as new runs. */
const LEGACY_QUADRANTS: Record<string, string> = {
  "Overvalued Premia / Weak Ground Truth": "Higher Model Gap / Lower Score",
  "Deep Value Discount / Strong Ground Truth": "Lower Model Gap / Higher Score",
  "Quality Premium / Strong Ground Truth": "Higher Model Gap / Higher Score",
  "Discount / Weak Ground Truth": "Lower Model Gap / Lower Score",
};

export function quadrantLabel(value: string | null | undefined): string {
  return value == null ? "Insufficient data" : LEGACY_QUADRANTS[value] ?? value;
}
