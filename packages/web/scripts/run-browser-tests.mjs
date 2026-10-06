import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Configured-provider browser cases intercept responses. Disable the real
// provider in the test server even when a local service account is configured.
const child = spawn(process.execPath, [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PLAYWRIGHT_DATA_MODE: "simulation", GALI_AI_ENABLED: "0" } });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
