import process from "node:process";
import { existsSync, readFileSync } from "node:fs";

const mode = process.argv.includes("--remote") ? "remote" : "local";
if (mode === "local" && existsSync(".dev.vars")) {
  for (const line of readFileSync(".dev.vars", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1] && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
const baseUrl = process.env.SEED_URL ?? (mode === "local" ? "http://localhost:5173" : undefined);
const secret = process.env.SEED_SECRET;

if (!baseUrl || !secret) {
  console.error(mode === "local"
    ? "Defina SEED_SECRET no ambiente e mantenha `npm run dev` em execução. Opcionalmente defina SEED_URL."
    : "Defina SEED_URL (URL publicada) e SEED_SECRET no ambiente.");
  process.exit(1);
}

const response = await fetch(new URL("/api/internal/seed", baseUrl), { method: "POST", headers: { "x-seed-secret": secret } });
const body = await response.text();
if (!response.ok) {
  console.error(`Seed falhou (${response.status}): ${body}`);
  process.exit(1);
}
console.log(body);
