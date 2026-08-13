import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const environment = process.argv[2];

if (!environment) {
  throw new Error("Informe o ambiente do Wrangler, por exemplo: dev");
}

const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const child = spawn(process.execPath, [viteCli, "build"], {
  env: {
    ...process.env,
    CLOUDFLARE_ENV: environment,
  },
  stdio: "inherit",
});

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

if (exitCode !== 0) {
  process.exitCode = exitCode;
}
