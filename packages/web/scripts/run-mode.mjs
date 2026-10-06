import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const [mode, command = "dev"] = process.argv.slice(2);
if (!["simulation", "sectors"].includes(mode) || !["dev", "build", "start"].includes(command)) { console.error("Usage: node scripts/run-mode.mjs simulation|sectors dev|build|start"); process.exit(1); }
const args = [require.resolve("next/dist/bin/next"), command];
if (command !== "build") args.push("-p", process.env.PORT ?? "3000", "-H", process.env.GALI_HOST ?? "127.0.0.1");
const child = spawn(process.execPath, args, { cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), stdio: "inherit", env: { ...process.env, GALI_DATA_MODE: mode } });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 0; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
