import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} terminou com código ${code ?? 1}.`)));
  });
}

const wranglerCli = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

await run(process.execPath, [wranglerCli, "d1", "migrations", "apply", "form-workout-tracker-prod-db", "--local"]);

const server = spawn(process.execPath, [viteCli, ...process.argv.slice(2)], { stdio: "inherit" });
const stop = () => { if (!server.killed) server.kill(); };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
server.once("error", (error) => { throw error; });
server.once("exit", (code) => { process.exitCode = code ?? 1; });
