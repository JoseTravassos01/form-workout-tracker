import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { AiWorkoutRepository, type AiGenerationMode } from "../../worker/repositories/ai-workout-repository";
import { TrainingService } from "../../worker/services/training-service";

const origin = "http://gym.test";

async function request(path: string, init: RequestInit = {}) {
  return exports.default.fetch(new Request(`${origin}${path}`, init));
}

async function login(username: string, password: string) {
  const response = await request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ username, password }) });
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
}

function futureIsoWeekday(weekday: number, weeksAhead = 2) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + weeksAhead * 7);
  while ((date.getUTCDay() || 7) !== weekday) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

beforeAll(async () => {
  const seeded = await request("/api/internal/seed", { method: "POST", headers: { origin, "x-seed-secret": env.SEED_SECRET } });
  expect(seeded.status).toBe(200);
});

describe("planejamento pessoal e hidratação", () => {
  it("mantém a geração por IA autenticada e inativa sem secret", async () => {
    const cookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const status = await request("/api/program/ai/status", { headers: { cookie } });
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ available: false, remainingToday: 10 });

    const generated = await request("/api/program/ai/generate", {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Quero um treino de hipertrofia quatro vezes por semana.", durationWeeks: 4, startDate: futureIsoWeekday(1) }),
    });
    expect(generated.status).toBe(503);
    expect(await env.DB.prepare("SELECT COUNT(*) count FROM ai_workout_generations").first<number>("count")).toBe(0);
  });

  it("cobra cinco chances por geração com PDF e limita esse modo a duas vezes", async () => {
    const profileId = "athlete:male:initial";
    const cookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const repository = new AiWorkoutRepository(env.DB);
    await env.DB.prepare("DELETE FROM ai_workout_generations WHERE athlete_profile_id=?").bind(profileId).run();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const reserve = (mode: AiGenerationMode, index: number, limit = 10) => repository.reserveGeneration({
      id: crypto.randomUUID(),
      profileId,
      model: "deepseek-test",
      durationWeeks: 4,
      promptLength: 50,
      mode,
      quotaCost: mode === "pdf" ? 5 : 1,
      documentCount: mode === "pdf" ? 1 : 0,
      documentTextLength: mode === "pdf" ? 100 : 0,
      createdAt: new Date(Date.now() + index).toISOString(),
      since,
      limit,
      pdfLimit: 2,
    });

    expect(await reserve("pdf", 1)).toBe(true);
    const status = await request("/api/program/ai/status", { headers: { cookie } }).then((response) => response.json() as Promise<{ remainingToday: number; pdfUsesToday: number; pdfRemainingToday: number; pdfGenerationCost: number }>);
    expect(status).toMatchObject({ remainingToday: 5, pdfUsesToday: 1, pdfRemainingToday: 1, pdfGenerationCost: 5 });
    for (let index = 0; index < 5; index += 1) expect(await reserve("text", index + 2)).toBe(true);
    expect(await reserve("text", 20)).toBe(false);

    await env.DB.prepare("DELETE FROM ai_workout_generations WHERE athlete_profile_id=?").bind(profileId).run();
    expect(await reserve("pdf", 30, 50)).toBe(true);
    expect(await reserve("pdf", 31, 50)).toBe(true);
    expect(await reserve("pdf", 32, 50)).toBe(false);
    await env.DB.prepare("DELETE FROM ai_workout_generations WHERE athlete_profile_id=?").bind(profileId).run();
  });

  it("registra água, preserva isolamento e atualiza lembrete com controle de versão", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const date = futureIsoWeekday(1, 0);
    const initial = await request(`/api/hydration?date=${date}`, { headers: { cookie: maleCookie } });
    expect(initial.status).toBe(200);
    const initialBody = await initial.json() as { todayMl: number; settings: { version: number } };
    expect(initialBody.todayMl).toBe(0);

    const added = await request("/api/hydration/logs", { method: "POST", headers: { cookie: maleCookie, origin, "content-type": "application/json" }, body: JSON.stringify({ localDate: date, loggedAt: `${date}T15:00:00-03:00`, amountMl: 500, idempotencyKey: crypto.randomUUID() }) });
    expect(added.status).toBe(201);
    expect((await added.json() as { totalMl: number }).totalMl).toBe(500);

    const settings = await request("/api/hydration/settings", { method: "PATCH", headers: { cookie: maleCookie, origin, "content-type": "application/json" }, body: JSON.stringify({ dailyGoalMl: 2500, reminderEnabled: true, reminderTime: "16:00", version: initialBody.settings.version }) });
    expect(settings.status).toBe(200);
    const female = await request(`/api/hydration?date=${date}`, { headers: { cookie: femaleCookie } }).then((response) => response.json() as Promise<{ todayMl: number }>);
    expect(female.todayMl).toBe(0);
  });

  it("adiciona cardio recorrente ao calendário e mantém sessões ao encerrar o plano", async () => {
    const cookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const monday = futureIsoWeekday(1);
    const fridayDate = new Date(`${monday}T12:00:00Z`);
    fridayDate.setUTCDate(fridayDate.getUTCDate() + 4);
    const friday = fridayDate.toISOString().slice(0, 10);
    const planResponse = await request("/api/cardio/plans", { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ startDate: monday, endDate: friday, weekdays: [1, 3, 5], modality: "Bicicleta leve", durationMin: 25, durationMax: 25, rpeMin: 3, rpeMax: 3, notes: "Cardio pessoal", recurrenceScope: "week", idempotencyKey: crypto.randomUUID() }) });
    expect(planResponse.status).toBe(201);
    const plan = await planResponse.json() as { id: string };

    const calendar = await request(`/api/calendar?from=${monday}&to=${friday}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ items: Array<{ date: string; templateId?: string; source?: string; planVersion?: number }> }>);
    const personal = calendar.items.filter((item) => item.templateId === plan.id);
    expect(personal.map((item) => item.date)).toEqual([monday, expect.any(String), friday]);
    expect(personal.every((item) => item.source === "personal")).toBe(true);

    const started = await request(`/api/cardio/${encodeURIComponent(plan.id)}/start`, { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ scheduledDate: monday, version: null }) });
    expect(started.status).toBe(200);
    const session = await started.json() as { id: string; version: number };
    const completed = await request(`/api/cardio/sessions/${encodeURIComponent(session.id)}/complete`, { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ actualDurationMinutes: 25, modality: "Bicicleta leve", actualRpe: 3, notes: "Concluído", version: session.version }) });
    expect(completed.status).toBe(200);

    const archived = await request(`/api/cardio/plans/${encodeURIComponent(plan.id)}?version=${personal[0]!.planVersion}`, { method: "DELETE", headers: { cookie, origin } });
    expect(archived.status).toBe(200);
    expect(await env.DB.prepare("SELECT status FROM cardio_sessions WHERE id=?").bind(session.id).first<string>("status")).toBe("completed");
  });

  it("cria ciclo mensal sem substituir o programa ativo e abre o treino no calendário", async () => {
    const cookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const monday = futureIsoWeekday(1, 3);
    const activeBefore = await env.DB.prepare("SELECT current_program_id id FROM athlete_profiles WHERE id='athlete:female:initial'").first<string>("id");
    const created = await request("/api/program/custom", { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ name: "Ciclo pessoal mensal", durationWeeks: 4, startDate: monday, idempotencyKey: crypto.randomUUID(), days: [{ weekday: 1, name: "Meu Lower", exercises: [{ name: "Hip Thrust", sets: 3, repsMin: 8, repsMax: 12, rirMin: 1, rirMax: 2, restSeconds: 150, notes: "Amplitude consistente" }] }] }) });
    expect(created.status).toBe(201);
    const program = await created.json() as { id: string };
    expect(await env.DB.prepare("SELECT current_program_id id FROM athlete_profiles WHERE id='athlete:female:initial'").first<string>("id")).toBe(activeBefore);

    const calendar = await request(`/api/calendar?from=${monday}&to=${monday}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ items: Array<{ source?: string; templateId?: string }> }>);
    const custom = calendar.items.find((item) => item.source === "custom");
    expect(custom?.templateId).toContain(program.id);

    const today = await new TrainingService(env.DB).today("athlete:female:initial", new Date(`${monday}T15:00:00Z`));
    expect(today?.workout?.name).toBe("Meu Lower");
    expect(today?.workout?.programId).toBe(program.id);

    const prepared = await request("/api/workouts/prepare", { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ trainingDayId: custom!.templateId, scheduledDate: monday, originalDate: monday }) });
    expect(prepared.status).toBe(201);
    const sessionId = (await prepared.json() as { id: string }).id;
    const workout = await request(`/api/workouts/${encodeURIComponent(sessionId)}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ name: string; exercises: Array<{ name: string }> }>);
    expect(workout.name).toBe("Meu Lower");
    expect(workout.exercises[0]?.name).toBe("Hip Thrust");
  });
});
