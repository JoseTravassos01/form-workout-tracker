import { expect, request, test, type Page } from "@playwright/test";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente para E2E: ${name}`);
  return value;
}

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const mondayDate = new Date(`${today}T12:00:00Z`);
mondayDate.setUTCDate(mondayDate.getUTCDate() - (mondayDate.getUTCDay() + 6) % 7);
const monday = mondayDate.toISOString().slice(0, 10);

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function rescheduleMondayToToday(page: Page) {
  const searchEndDate = new Date(`${monday}T12:00:00Z`);
  searchEndDate.setUTCDate(searchEndDate.getUTCDate() + 14);
  const result = await page.evaluate(async ({ mondayDate, searchEnd, todayDate }) => {
    const program = await fetch("/api/program").then((response) => response.json()) as { program: { id: string } };
    const calendar = await fetch(`/api/calendar?from=${mondayDate}&to=${searchEnd}`).then((response) => response.json()) as {
      items: Array<{ date: string; kind: string; templateId?: string; status: string; override?: { version?: number; originalDate?: string } }>;
    };
    const belongsToCurrentProgram = (item: { templateId?: string }) => item.templateId?.startsWith(`${program.program.id}:`) === true;
    const arrival = calendar.items.find((item) => item.date === todayDate && item.kind === "strength" && belongsToCurrentProgram(item) && !["missed", "rest", "skipped"].includes(item.status));
    if (arrival) return { status: 200, body: { alreadyScheduled: true } };
    const source = calendar.items.find((item) => item.kind === "strength" && belongsToCurrentProgram(item) && new Date(`${item.date}T12:00:00Z`).getUTCDay() === 1);
    if (!source?.templateId) throw new Error("Treino de segunda não encontrado no calendário.");
    const response = await fetch("/api/calendar/overrides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ originalDate: source.override?.originalDate ?? source.date, newDate: todayDate, trainingDayId: source.templateId, action: "rescheduled", reason: "E2E", version: source.override?.version ?? null }),
    });
    return { status: response.status, body: await response.json() };
  }, { mondayDate: monday, searchEnd: searchEndDate.toISOString().slice(0, 10), todayDate: today });
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

test("abre uma ficha futura pelo calendário e adiciona uma série", async ({ page }) => {
  await login(page, required("MALE_USERNAME"), required("MALE_PASSWORD"));
  await page.goto("/app/calendar");
  const monthGrid = page.locator(".calendar-grid.month");
  await expect(monthGrid).toBeVisible();
  await expect(page.locator(".mobile-calendar-agenda")).toBeVisible();
  const mobileLayout = await monthGrid.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewportWidth = element.ownerDocument.defaultView?.innerWidth ?? element.ownerDocument.documentElement.clientWidth;
    return { fitsViewport: rect.left >= 0 && rect.right <= viewportWidth + 1, hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1 };
  });
  expect(mobileLayout).toEqual({ fitsViewport: true, hasHorizontalOverflow: false });

  await page.getByRole("button", { name: "SEMANA" }).click();
  const weekGrid = page.locator(".calendar-grid.week");
  await expect(weekGrid).toBeVisible();
  const futureStrengthDay = page.locator(".day-event.event-strength").last();
  await expect(futureStrengthDay).toBeVisible();
  await futureStrengthDay.click();
  await page.getByRole("button", { name: "VER EXERCÍCIOS" }).click();
  await expect(page).toHaveURL(/\/app\/workout\//);

  const exercise = page.locator(".exercise-card").first();
  await exercise.getByRole("button", { name: "Editar treino" }).click();
  const plannedSets = exercise.locator(".planned-sets strong");
  const originalSetCount = Number(await plannedSets.textContent());
  await exercise.getByRole("button", { name: "Adicionar uma série" }).click();
  await expect(plannedSets).toHaveText(String(originalSetCount + 1));
  await exercise.getByRole("button", { name: "SALVAR ALTERAÇÃO" }).click();
  await expect(page.getByText("Alteração salva para este treino e para as próximas semanas.")).toBeVisible();
  await expect(exercise.locator(".exercise-heading p")).toContainText(`${originalSetCount + 1} séries`);
});

test("fluxos críticos dos dois perfis permanecem isolados", async ({ page }) => {
  await login(page, required("MALE_USERNAME"), required("MALE_PASSWORD"));
  await expect(page.getByRole("heading", { name: required("MALE_DISPLAY_NAME") })).toBeVisible();
  await rescheduleMondayToToday(page);
  await page.goto("/app");
  await expect(page.locator(".today-hero h2")).toBeVisible();
  await page.getByRole("link", { name: /INICIAR TREINO|CONTINUAR TREINO|VER TREINO/ }).click();
  await registerFirstSetAndFinish(page);
  await page.goto("/app/profile");
  await page.getByRole("button", { name: "SAIR DA CONTA" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, required("FEMALE_USERNAME"), required("FEMALE_PASSWORD"));
  await expect(page.getByRole("heading", { name: required("FEMALE_DISPLAY_NAME") })).toBeVisible();
  await expect(page.getByText(required("MALE_DISPLAY_NAME"))).toHaveCount(0);
  const crossAccessStatus = await page.evaluate(async () => (await fetch("/api/program/blocks/program:male-2026:2026.2:block:1")).status);
  expect(crossAccessStatus).toBe(404);

  await rescheduleMondayToToday(page);
  await page.goto("/app");
  await expect(page.locator(".today-hero h2")).toBeVisible();
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
