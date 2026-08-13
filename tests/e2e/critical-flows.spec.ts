import { expect, request, test, type Page } from "@playwright/test";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente para E2E: ${name}`);
  return value;
}

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const today = "2026-08-13";
const monday = "2026-08-10";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function rescheduleMondayToToday(page: Page) {
  const result = await page.evaluate(async ({ mondayDate, todayDate }) => {
    const calendar = await fetch(`/api/calendar?from=${mondayDate}&to=${todayDate}`).then((response) => response.json()) as {
      items: Array<{ date: string; kind: string; templateId?: string; override?: { version?: number } }>;
    };
    const source = calendar.items.find((item) => item.date === mondayDate && item.kind === "strength");
    if (!source?.templateId) throw new Error("Treino de segunda não encontrado no calendário.");
    const response = await fetch("/api/calendar/overrides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ originalDate: mondayDate, newDate: todayDate, trainingDayId: source.templateId, action: "rescheduled", reason: "E2E", version: source.override?.version ?? null }),
    });
    return { status: response.status, body: await response.json() };
  }, { mondayDate: monday, todayDate: today });
  expect(result.status).toBeLessThan(300);
}

async function registerFirstSetAndFinish(page: Page) {
  const start = page.locator(".start-workout-card button");
  if (await start.isVisible()) await start.click();
  const finish = page.getByRole("button", { name: "CONCLUIR TREINO" });
  if (!await finish.isVisible()) return;
  await expect(finish).toBeVisible();
  const exercise = page.locator(".exercise-card").first();
  await exercise.locator('input[aria-label="kg"]').first().fill("20");
  await exercise.locator('input[aria-label="reps"]').first().fill("8");
  await exercise.locator(".rir-picker").first().getByRole("button", { name: "2", exact: true }).click();
  await exercise.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Série registrada.")).toBeVisible();
  await finish.click();
  await expect(page.getByText(/Treino (concluído|finalizado como parcial) e sincronizado\./)).toBeVisible();
}

test.beforeAll(async () => {
  const api = await request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  const response = await api.post("/api/internal/seed", { headers: { "x-seed-secret": required("SEED_SECRET") } });
  expect(response.ok()).toBeTruthy();
  await api.dispose();
});

test("fluxos críticos dos dois perfis permanecem isolados", async ({ page }) => {
  await login(page, required("MALE_USERNAME"), required("MALE_PASSWORD"));
  await expect(page.getByRole("heading", { name: required("MALE_DISPLAY_NAME") })).toBeVisible();
  await rescheduleMondayToToday(page);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: /Upper A/ })).toBeVisible();
  await page.getByRole("link", { name: /INICIAR TREINO|CONTINUAR TREINO|VER TREINO/ }).click();
  await registerFirstSetAndFinish(page);
  await page.goto("/app/profile");
  await page.getByRole("button", { name: "SAIR DA CONTA" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, required("FEMALE_USERNAME"), required("FEMALE_PASSWORD"));
  await expect(page.getByRole("heading", { name: required("FEMALE_DISPLAY_NAME") })).toBeVisible();
  await expect(page.getByText(required("MALE_DISPLAY_NAME"))).toHaveCount(0);
  const crossAccessStatus = await page.evaluate(async () => (await fetch("/api/program/blocks/program:male-2026:2026.1:block:1")).status);
  expect(crossAccessStatus).toBe(404);

  await rescheduleMondayToToday(page);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: /Inferiores A/ })).toBeVisible();
  await page.getByRole("link", { name: /INICIAR TREINO|CONTINUAR TREINO|VER TREINO/ }).click();
  await registerFirstSetAndFinish(page);

  await page.goto("/app/progress/body");
  await page.getByRole("button", { name: "REGISTRAR" }).click();
  await page.getByLabel("Peso (kg)").fill("70.5");
  await page.getByRole("button", { name: "SALVAR REGISTRO" }).click();
  await expect(page.getByText("70.5 kg").first()).toBeVisible();
  await page.goto("/app/progress");
  await expect(page.getByRole("heading", { name: "Progresso" })).toBeVisible();
});
