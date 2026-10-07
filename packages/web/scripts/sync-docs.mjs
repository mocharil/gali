// The Methodology page renders docs/METRICS.md. Vercel builds this package on its own (Root Directory
// packages/web), so the repo-level docs/ folder is not there; a copy lives in content/ and is bundled.
// Run from a full checkout this refreshes the copy; from a package-only checkout it keeps the committed one.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "../../docs/METRICS.md");
const target = path.join(root, "content/METRICS.md");
if (!existsSync(source)) {
  console.log("sync-docs: docs/METRICS.md not found (package-only checkout); using the committed content/METRICS.md");
} else {
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log("sync-docs: content/METRICS.md refreshed from docs/METRICS.md");
}
