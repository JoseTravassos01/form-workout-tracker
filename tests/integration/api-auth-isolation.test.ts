import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../worker/lib/crypto";

const origin = "http://gym.test";

async function request(path: string, init: RequestInit = {}) {
  return exports.default.fetch(new Request(`${origin}${path}`, init));
}

async function login(username: string, password: string): Promise<string> {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ username, password }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie");
  expect(cookie).toContain("gym_session=");
  return cookie?.split(";", 1)[0] ?? "";
}

beforeAll(async () => {
  const seeded = await request("/api/internal/seed", { method: "POST", headers: { origin, "x-seed-secret": env.SEED_SECRET } });
  expect(seeded.status).toBe(200);
});

describe("autenticação e isolamento server-side", () => {
  it("usa hash com salt e rejeita a senha incorreta", async () => {
    const hash = await hashPassword("uma-senha-de-teste-bem-longa");
    expect(hash).not.toContain("uma-senha-de-teste-bem-longa");
    expect(await verifyPassword("uma-senha-de-teste-bem-longa", hash)).toBe(true);
    expect(await verifyPassword("senha-incorreta", hash)).toBe(false);
  });

  it("não expõe rota privada sem sessão", async () => {
    expect((await request("/api/me")).status).toBe(401);
  });

  it("mantém programa e blocos femininos fora da sessão masculina", async () => {
    const cookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const me = await request("/api/me", { headers: { cookie } });
    expect(me.status).toBe(200);
    expect((await me.json() as { athlete: { sex: string } }).athlete.sex).toBe("male");

    const ownProgram = await request("/api/program", { headers: { cookie } });
    expect(ownProgram.status).toBe(200);
    expect((await ownProgram.json() as { program: { id: string } }).program.id).toContain("male-2026");

    const forbiddenProgram = await request("/api/program/blocks/program:female-2026:1.0.0:block:1", { headers: { cookie } });
    expect(forbiddenProgram.status).toBe(404);

    const names = await env.DB.prepare(`SELECT p.program_key programKey,ep.display_name displayName FROM exercise_prescriptions ep
      JOIN exercises e ON e.id=ep.exercise_id JOIN training_days d ON d.id=ep.training_day_id
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      WHERE e.slug='puxada-neutra' AND b.block_number=1 ORDER BY p.program_key`).all<{ programKey: string; displayName: string }>();
    expect(names.results).toContainEqual({ programKey: "male-2026", displayName: "Puxada neutra" });
    expect(names.results).toContainEqual({ programKey: "female-2026", displayName: "Puxada alta com pegada neutra" });
  });

  it("cria sessões independentes e invalida a sessão no logout", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const [maleMe, femaleMe] = await Promise.all([
      request("/api/me", { headers: { cookie: maleCookie } }).then((response) => response.json() as Promise<{ athlete: { id: string; sex: string } }>),
      request("/api/me", { headers: { cookie: femaleCookie } }).then((response) => response.json() as Promise<{ athlete: { id: string; sex: string } }>),
    ]);
    expect(maleMe.athlete.sex).toBe("male");
    expect(femaleMe.athlete.sex).toBe("female");
    expect(maleMe.athlete.id).not.toBe(femaleMe.athlete.id);

    const logout = await request("/api/auth/logout", { method: "POST", headers: { cookie: maleCookie, origin } });
    expect(logout.status).toBe(200);
    expect((await request("/api/me", { headers: { cookie: maleCookie } })).status).toBe(401);
    expect((await request("/api/me", { headers: { cookie: femaleCookie } })).status).toBe(200);
  });

  it("entrega a ficha completa, inclui sessão parcial anterior e persiste a série confirmada", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const row = await env.DB.prepare(`SELECT d.id dayId,ep.id prescriptionId,ep.exercise_id exerciseId
      FROM training_days d JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      JOIN exercise_prescriptions ep ON ep.training_day_id=d.id
      WHERE p.program_key='male-2026' AND b.block_number=1 AND d.weekday=1 AND ep.order_index=1`).first<{ dayId: string; prescriptionId: string; exerciseId: string }>();
    expect(row).not.toBeNull();
    const previousSessionId = "integration:workout:previous";
    const currentSessionId = "integration:workout:current";
    const previousLogId = "integration:exercise-log:previous";
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,started_at,finished_at,status)
        VALUES (?,'athlete:male:initial',?,'2026-07-20','2026-07-20','2026-07-20T10:00:00Z','2026-07-20T11:00:00Z','partial')`).bind(previousSessionId, row!.dayId),
      env.DB.prepare(`INSERT INTO exercise_logs (id,workout_session_id,exercise_prescription_id,exercise_id,completed,technique_confirmed)
        VALUES (?,?,?,?,1,1)`).bind(previousLogId, previousSessionId, row!.prescriptionId, row!.exerciseId),
      env.DB.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,notes,completed)
        VALUES ('integration:set:previous',?,1,50000,10,2,'Execução anterior estável',1)`).bind(previousLogId),
      env.DB.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,notes,completed)
        VALUES ('integration:set:previous:2',?,2,50000,9,2,'',1)`).bind(previousLogId),
      env.DB.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,notes,completed)
        VALUES ('integration:set:previous:3',?,3,50000,8,2,'',1)`).bind(previousLogId),
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES (?,'athlete:male:initial',?,'2026-08-10','2026-08-10','scheduled')`).bind(currentSessionId, row!.dayId),
    ]);

    const workoutResponse = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}`, { headers: { cookie: maleCookie } });
    expect(workoutResponse.status).toBe(200);
    const workout = await workoutResponse.json() as { version: number; exercises: Array<{ prescriptionId: string; exerciseId: string; equipment: string | null; previousSession: null | { scheduledDate: string; sets: Array<{ notes: string }> }; progressionSuggestion: null | { kind: string } }> };
    const exercise = workout.exercises.find((item) => item.prescriptionId === row!.prescriptionId);
    expect(exercise?.equipment).toBe("Máquina ou barra");
    expect(exercise?.previousSession?.scheduledDate).toBe("2026-07-20");
    expect(exercise?.previousSession?.sets[0]?.notes).toBe("Execução anterior estável");
    expect(exercise?.progressionSuggestion?.kind).toBe("hold_and_add_reps");

    const startResponse = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}/start`, {
      method: "POST", headers: { cookie: maleCookie, origin, "content-type": "application/json" }, body: JSON.stringify({ version: workout.version }),
    });
    expect(startResponse.status).toBe(200);
    const saveResponse = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}/exercises/${encodeURIComponent(row!.prescriptionId)}/sets`, {
      method: "POST", headers: { cookie: maleCookie, origin, "content-type": "application/json" }, body: JSON.stringify({ setNumber: 1, loadKg: 52.5, reps: 10, actualRir: 2, notes: "Série nova confirmada", completed: true, version: null, idempotencyKey: crypto.randomUUID() }),
    });
    expect(saveResponse.status).toBe(200);
    const stored = await env.DB.prepare(`SELECT sl.load_grams loadGrams,sl.reps,sl.actual_rir actualRir,sl.notes,sl.completed
      FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id WHERE el.workout_session_id=? AND sl.set_number=1`).bind(currentSessionId).first<{ loadGrams: number; reps: number; actualRir: number; notes: string; completed: number }>();
    expect(stored).toEqual({ loadGrams: 52500, reps: 10, actualRir: 2, notes: "Série nova confirmada", completed: 1 });

    const refreshed = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}`, { headers: { cookie: maleCookie } }).then((response) => response.json() as Promise<{ completionPercent: number }>);
    expect(refreshed.completionPercent).toBeGreaterThan(0);
    const history = await request(`/api/exercises/${encodeURIComponent(row!.exerciseId)}/history`, { headers: { cookie: maleCookie } }).then((response) => response.json() as Promise<{ bestLoad: number; sessionCount: number; history: Array<{ notes: string }> }>);
    expect(history.bestLoad).toBe(52.5);
    expect(history.sessionCount).toBe(2);
    expect(history.history[0]?.notes).toBe("Série nova confirmada");

    expect((await request(`/api/workouts/${encodeURIComponent(currentSessionId)}`, { headers: { cookie: femaleCookie } })).status).toBe(404);
    expect((await request(`/api/exercises/${encodeURIComponent(row!.exerciseId)}/history`, { headers: { cookie: femaleCookie } })).status).toBe(404);
  });

  it("aplica a readaptação masculina e mantém a condição feminina como decisão explícita", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const days = await env.DB.prepare(`SELECT p.program_key programKey,d.id dayId FROM training_days d
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      WHERE b.block_number=1 AND d.weekday=1`).all<{ programKey: string; dayId: string }>();
    const maleDay = days.results.find((item) => item.programKey === "male-2026")!;
    const femaleDay = days.results.find((item) => item.programKey === "female-2026")!;
    await env.DB.batch([
      env.DB.prepare("UPDATE program_state SET current_week=1,current_block=1,manual_override=1 WHERE athlete_profile_id='athlete:male:initial'"),
      env.DB.prepare("UPDATE program_state SET current_week=1,current_block=1,manual_override=1 WHERE athlete_profile_id='athlete:female:initial'"),
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES ('integration:readaptation:male','athlete:male:initial',?,'2026-01-05','2026-01-05','scheduled')`).bind(maleDay.dayId),
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES ('integration:readaptation:female','athlete:female:initial',?,'2026-01-05','2026-01-05','scheduled')`).bind(femaleDay.dayId),
    ]);
    try {
      const male = await request("/api/workouts/integration%3Areadaptation%3Amale", { headers: { cookie: maleCookie } }).then((response) => response.json() as Promise<{ guidance: string; exercises: Array<{ sets: number; rirMin: number; rirMax: number }> }>);
      expect(male.guidance).toContain("uma série a menos");
      expect(male.exercises[0]).toMatchObject({ sets: 2, rirMin: 3, rirMax: 4 });

      const female = await request("/api/workouts/integration%3Areadaptation%3Afemale", { headers: { cookie: femaleCookie } }).then((response) => response.json() as Promise<{ guidance: string; exercises: Array<{ sets: number }> }>);
      expect(female.guidance).toContain("não foi alterada automaticamente");
      expect(female.exercises[0]?.sets).toBe(3);
    } finally {
      await env.DB.batch([
        env.DB.prepare("UPDATE program_state SET manual_override=0 WHERE athlete_profile_id='athlete:male:initial'"),
        env.DB.prepare("UPDATE program_state SET manual_override=0 WHERE athlete_profile_id='athlete:female:initial'"),
      ]);
    }
  });
});
