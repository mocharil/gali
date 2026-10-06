import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../packages/web");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error("GALI requires Node.js 20.9 or newer. Update Node and try again.");
  process.exit(1);
}

function execute(args) {
  return new Promise((resolve, reject) => {
    const executable = process.env.npm_execpath;
    const child = executable
      ? spawn(process.execPath, [executable, ...args], { cwd: web, stdio: "inherit" })
      : spawn(process.platform === "win32" ? "cmd.exe" : "npm", process.platform === "win32" ? ["/d", "/s", "/c", "npm", ...args] : args, { cwd: web, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
    const stop = (signal) => child.kill(signal);
    const sigint = () => stop("SIGINT"), sigterm = () => stop("SIGTERM");
    process.once("SIGINT", sigint); process.once("SIGTERM", sigterm);
    child.on("close", () => { process.removeListener("SIGINT", sigint); process.removeListener("SIGTERM", sigterm); });
  });
}

try {
  const dependencies = JSON.parse(readFileSync(path.join(web, "package.json"), "utf8")).dependencies;
  const missingAi = ["@google/genai", "server-only"].some((name) => {
    const filename = path.join(web, "node_modules", name, "package.json");
    try { return JSON.parse(readFileSync(filename, "utf8")).version !== dependencies[name]; } catch { return true; }
  });
  if (!existsSync(path.join(web, "node_modules/next/dist/bin/next")) || missingAi) {
    console.log("Installing frontend and Gemini dependencies from package-lock.json…");
    const code = await execute(["ci"]);
    if (code !== 0) { console.error("Installation failed. Check your npm connection, then run npm run setup."); process.exit(code); }
  }
  console.log(`GALI · http://localhost:${process.env.PORT ?? "3000"} · Local dataset active`);
  process.exitCode = await execute(["run", "local"]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
