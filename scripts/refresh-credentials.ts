import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { hashPassword } from "../worker/lib/crypto";

type Target = "dev" | "prod";

const targetIndex = process.argv.indexOf("--target");
const target = process.argv[targetIndex + 1] as Target | undefined;
if (target !== "dev" && target !== "prod") throw new Error("Use --target dev ou --target prod.");

if (existsSync(".dev.vars")) {
  for (const line of (await readFile(".dev.vars", "utf8")).split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1] && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 3) throw new Error(`Valor obrigatório ausente em .dev.vars: ${name}`);
  return value;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const accounts = await Promise.all([
  {
    userId: "user:male:initial",
    username: required("MALE_USERNAME").trim().toLocaleLowerCase("pt-BR"),
    passwordHash: await hashPassword(required("MALE_PASSWORD")),
  },
  {
    userId: "user:female:initial",
    username: required("FEMALE_USERNAME").trim().toLocaleLowerCase("pt-BR"),
    passwordHash: await hashPassword(required("FEMALE_PASSWORD")),
  },
]);

const sql = `${accounts.map((account) => `UPDATE users
SET username=${sqlLiteral(account.username)},password_hash=${sqlLiteral(account.passwordHash)},active=1,updated_at=CURRENT_TIMESTAMP
WHERE id=${sqlLiteral(account.userId)};`).join("\n")}
SELECT COUNT(*) AS updated_users FROM users
WHERE id IN ('user:male:initial','user:female:initial')
  AND password_hash LIKE 'pbkdf2_sha256$100000$%';
`;

const config = target === "dev"
  ? { database: "form-workout-tracker-dev-db", environment: "dev" }
  : { database: "form-workout-tracker-prod-db", environment: "" };
const temporaryDirectory = await mkdtemp(join(tmpdir(), "gym-credentials-"));
const sqlPath = join(temporaryDirectory, "refresh-credentials.sql");
const wranglerPath = join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");

try {
  await writeFile(sqlPath, sql, { encoding: "utf8", mode: 0o600 });
  const exitCode = await new Promise<number>((resolve, reject) => {
    const command = spawn(process.execPath, [wranglerPath, "d1", "execute", config.database, "--remote", "--env", config.environment, "--file", sqlPath], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    command.once("error", reject);
    command.once("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) throw new Error(`Wrangler encerrou com código ${exitCode}.`);
  console.log(`Credenciais atualizadas no ambiente ${target}. Confirme que updated_users = 2.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
