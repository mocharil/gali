/** Quote every CSV field and prevent user-controlled spreadsheet formulas. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCSV(filename: string, rows: unknown[][]): void {
  const synthetic = document.body.dataset.datasetMode === "simulation";
  const attributed = synthetic ? rows.map((row, index) => index === 0 ? ["Dataset Source", "Dataset As Of", ...row] : ["synthetic", document.body.dataset.datasetAsOf ?? "", ...row]) : rows;
  const csv = "\uFEFF" + attributed.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
