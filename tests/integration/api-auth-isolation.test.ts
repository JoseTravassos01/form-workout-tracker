import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../worker/lib/crypto";

const origin = "http://gym.test";

function isoWeekday(date: string, weekday: number, direction: 1 | -1): string {
  const candidate = new Date(`${date}T12:00:00Z`);
  do candidate.setUTCDate(candidate.getUTCDate() + direction); while ((candidate.getUTCDay() || 7) !== weekday);
  return candidate.toISOString().slice(0, 10);
}

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
  it("ativa as versões dos novos PDFs, preserva as anteriores e mantém o seed idempotente", async () => {
    const before = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM training_programs) programs,
      (SELECT COUNT(*) FROM training_blocks) blocks,
      (SELECT COUNT(*) FROM training_days) days,
      (SELECT COUNT(*) FROM exercise_prescriptions) prescriptions`).first<{ programs: number; blocks: number; days: number; prescriptions: number }>();
    const seeded = await request("/api/internal/seed", { method: "POST", headers: { origin, "x-seed-secret": env.SEED_SECRET } });
    expect(seeded.status).toBe(200);
    const after = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM training_programs) programs,
      (SELECT COUNT(*) FROM training_blocks) blocks,
      (SELECT COUNT(*) FROM training_days) days,
      (SELECT COUNT(*) FROM exercise_prescriptions) prescriptions`).first<typeof before>();
    expect(after).toEqual(before);

    const programs = await env.DB.prepare(`SELECT a.sex,p.id,p.version FROM athlete_profiles a JOIN training_programs p ON p.athlete_profile_id=a.id ORDER BY a.sex,p.version`).all<{ sex: string; id: string; version: string }>();
    expect(programs.results.filter((item) => item.sex === "female").map((item) => item.version)).toEqual(["2026.1", "2026.2", "2026.3"]);
    expect(programs.results.filter((item) => item.sex === "male").map((item) => item.version)).toEqual(["2026.1", "2026.2"]);
    const active = await env.DB.prepare("SELECT sex,current_program_id currentProgramId FROM athlete_profiles ORDER BY sex").all<{ sex: string; currentProgramId: string }>();
    expect(active.results.find((item) => item.sex === "female")?.currentProgramId).toBe("program:female-2026:2026.3");
    expect(active.results.find((item) => item.sex === "male")?.currentProgramId).toBe("program:male-2026:2026.2");

    const destructiveMigration = env.TEST_MIGRATIONS.flatMap((migration) => migration.queries.map((query) => ({ name: migration.name, query })))
      .find(({ query }) => /^\s*(?:DROP|DELETE|TRUNCATE)\b/i.test(query));
    expect(destructiveMigration).toBeUndefined();

    // Simula duas ativações no mesmo dia, como acontece quando o ambiente já
    // recebeu uma versão e a ficha seguinte é publicada horas depois.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM athlete_program_assignments WHERE athlete_profile_id='athlete:female:initial' AND program_id='program:female-2026:2026.3'"),
      env.DB.prepare("UPDATE athlete_program_assignments SET effective_from=date('now'),effective_to=NULL WHERE athlete_profile_id='athlete:female:initial' AND program_id='program:female-2026:2026.2'"),
      env.DB.prepare("UPDATE athlete_profiles SET current_program_id='program:female-2026:2026.2' WHERE id='athlete:female:initial'"),
    ]);
    const sameDaySeed = await request("/api/internal/seed", { method: "POST", headers: { origin, "x-seed-secret": env.SEED_SECRET } });
    expect(sameDaySeed.status).toBe(200);
    const assignments = await env.DB.prepare(`SELECT program_id programId,effective_from effectiveFrom,effective_to effectiveTo
      FROM athlete_program_assignments WHERE athlete_profile_id='athlete:female:initial'
        AND program_id IN ('program:female-2026:2026.2','program:female-2026:2026.3') ORDER BY program_id`)
      .all<{ programId: string; effectiveFrom: string; effectiveTo: string | null }>();
    expect(assignments.results).toEqual([
      { programId: "program:female-2026:2026.2", effectiveFrom: expect.any(String), effectiveTo: expect.any(String) },
      { programId: "program:female-2026:2026.3", effectiveFrom: expect.any(String), effectiveTo: null },
    ]);
    expect(assignments.results[0]!.effectiveTo! >= assignments.results[0]!.effectiveFrom).toBe(true);
  });

  it("mantém histórico feminino V1/V2 acessível enquanto novos treinos usam V3", async () => {
    const cookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const assignment = await env.DB.prepare(`SELECT effective_from effectiveFrom FROM athlete_program_assignments
      WHERE athlete_profile_id='athlete:female:initial' AND program_id='program:female-2026:2026.3'`).first<{ effectiveFrom: string }>();
    expect(assignment).not.toBeNull();
    const oldMonday = isoWeekday(assignment!.effectiveFrom, 1, -1);
    const oldItem = await env.DB.prepare(`SELECT d.id templateId FROM training_days d JOIN training_blocks b ON b.id=d.block_id
      WHERE b.program_id='program:female-2026:2026.1' AND b.block_number=1 AND d.weekday=1`).first<{ templateId: string }>();
    expect(oldItem).not.toBeNull();
    const prescription = await env.DB.prepare("SELECT id,exercise_id exerciseId FROM exercise_prescriptions WHERE training_day_id=? ORDER BY order_index LIMIT 1")
      .bind(oldItem!.templateId).first<{ id: string; exerciseId: string }>();
    const sessionId = "integration:female:v1:history";
    const logId = "integration:female:v1:log";
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES (?,'athlete:female:initial',?,?,?,'completed') ON CONFLICT(id) DO NOTHING`).bind(sessionId, oldItem!.templateId, oldMonday, oldMonday),
      env.DB.prepare(`INSERT INTO exercise_logs (id,workout_session_id,exercise_prescription_id,exercise_id,completed,technique_confirmed)
        VALUES (?,?,?,?,1,1) ON CONFLICT(id) DO NOTHING`).bind(logId, sessionId, prescription!.id, prescription!.exerciseId),
      env.DB.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,completed)
        VALUES ('integration:female:v1:set',?,1,42500,10,2,1) ON CONFLICT(id) DO NOTHING`).bind(logId),
    ]);
    const oldWorkout = await request(`/api/workouts/${encodeURIComponent(sessionId)}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ programVersion: string; exercises: Array<{ exerciseId: string }> }>);
    expect(oldWorkout.programVersion).toBe("2026.1");
    expect(await env.DB.prepare("SELECT COUNT(*) count FROM training_programs WHERE id='program:female-2026:2026.2'").first<number>("count")).toBe(1);

    await request("/api/internal/seed", { method: "POST", headers: { origin, "x-seed-secret": env.SEED_SECRET } });
    expect(await env.DB.prepare("SELECT COUNT(*) count FROM workout_sessions WHERE id=?").bind(sessionId).first<number>("count")).toBe(1);
    const history = await request(`/api/exercises/${encodeURIComponent(prescription!.exerciseId)}/history`, { headers: { cookie } }).then((response) => response.json() as Promise<{ history: Array<{ loadKg: number }> }>);
    expect(history.history.some((item) => item.loadKg === 42.5)).toBe(true);

    const newMonday = isoWeekday(assignment!.effectiveFrom, 1, 1);
    const newCalendar = await request(`/api/calendar?from=${newMonday}&to=${newMonday}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ items: Array<{ kind: string; templateId?: string; name: string }> }>);
    const newItem = newCalendar.items.find((item) => item.kind === "strength");
    expect(newItem).toMatchObject({ name: "Lower A — Glúteo Médio + Glúteo Máximo" });
    expect(newItem?.templateId).toContain("program:female-2026:2026.3");
    const prepared = await request("/api/workouts/prepare", {
      method: "POST", headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ trainingDayId: newItem!.templateId, scheduledDate: newMonday, originalDate: newMonday }),
    });
    expect(prepared.status).toBe(201);
    const preparedId = (await prepared.json() as { id: string }).id;
    const currentWorkout = await request(`/api/workouts/${encodeURIComponent(preparedId)}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ programVersion: string }>);
    expect(currentWorkout.programVersion).toBe("2026.3");
  });

  it("calcula a especialização de glúteo médio somente pelas séries diretas", async () => {
    const cookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const volumes = await env.DB.prepare(`SELECT b.block_number blockNumber,SUM(ep.sets) directSets,GROUP_CONCAT(DISTINCT d.weekday) weekdays
      FROM training_blocks b JOIN training_days d ON d.block_id=b.id JOIN exercise_prescriptions ep ON ep.training_day_id=d.id
      WHERE b.program_id='program:female-2026:2026.3' AND ep.direct_glute_medius=1 GROUP BY b.block_number ORDER BY b.block_number`)
      .all<{ blockNumber: number; directSets: number; weekdays: string }>();
    expect(volumes.results.map((item) => Number(item.directSets))).toEqual([11, 13, 15, 12]);
    expect(volumes.results.every((item) => item.weekdays === "1,3,6")).toBe(true);

    const upper = await env.DB.prepare(`SELECT b.block_number blockNumber,COUNT(*) exerciseCount,SUM(CASE WHEN ep.category='chest' THEN 1 ELSE 0 END) chest
      FROM training_blocks b JOIN training_days d ON d.block_id=b.id JOIN exercise_prescriptions ep ON ep.training_day_id=d.id
      WHERE b.program_id='program:female-2026:2026.3' AND d.weekday=2 GROUP BY b.block_number ORDER BY b.block_number`)
      .all<{ blockNumber: number; exerciseCount: number; chest: number }>();
    expect(upper.results.every((item) => Number(item.exerciseCount) === 6 && Number(item.chest) === 0)).toBe(true);

    const program = await request("/api/program", { headers: { cookie } }).then((response) => response.json() as Promise<{ program: { version: string }; focus: { title: string; frequency: number; plannedSets: number } }>);
    expect(program.program.version).toBe("2026.3");
    expect(program.focus).toMatchObject({ title: "Glúteo Médio", frequency: 3, plannedSets: 11 });
  });

  it("aceita outro exercício por texto e reaplica a escolha nas semanas seguintes", async () => {
    const cookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const assignment = await env.DB.prepare(`SELECT effective_from effectiveFrom FROM athlete_program_assignments
      WHERE athlete_profile_id='athlete:female:initial' AND program_id='program:female-2026:2026.3'`).first<{ effectiveFrom: string }>();
    const firstMonday = isoWeekday(assignment!.effectiveFrom, 1, 1);
    const secondMondayDate = new Date(`${firstMonday}T12:00:00Z`);
    secondMondayDate.setUTCDate(secondMondayDate.getUTCDate() + 7);
    const secondMonday = secondMondayDate.toISOString().slice(0, 10);
    const day = await env.DB.prepare(`SELECT d.id FROM training_days d JOIN training_blocks b ON b.id=d.block_id
      WHERE b.program_id='program:female-2026:2026.3' AND b.block_number=1 AND d.weekday=1`).first<{ id: string }>();
    const prepare = async (date: string) => request("/api/workouts/prepare", {
      method: "POST", headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ trainingDayId: day!.id, scheduledDate: date, originalDate: date }),
    }).then((response) => response.json() as Promise<{ id: string }>);
    const first = await prepare(firstMonday);
    const firstWorkout = await request(`/api/workouts/${encodeURIComponent(first.id)}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ exercises: Array<{ prescriptionId: string; exerciseId: string; originalExerciseId: string; sets: number; customizationVersion: number | null }> }>);
    const source = firstWorkout.exercises[0]!;
    const customized = await request(`/api/workouts/${encodeURIComponent(first.id)}/exercises/${encodeURIComponent(source.prescriptionId)}/customization`, {
      method: "PATCH", headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ replacementPrescriptionId: null, customExerciseName: "Agachamento Belt Squat da academia", applyToFuture: true, sets: source.sets, version: source.customizationVersion }),
    });
    expect(customized.status).toBe(200);
    const current = await request(`/api/workouts/${encodeURIComponent(first.id)}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ exercises: Array<{ exerciseId: string; originalExerciseId: string; name: string; customizationSource: string }> }>);
    const currentExercise = current.exercises[0]!;
    expect(currentExercise).toMatchObject({ name: "Agachamento Belt Squat da academia", customizationSource: "session" });
    expect(currentExercise.exerciseId).not.toBe(currentExercise.originalExerciseId);

    const second = await prepare(secondMonday);
    const future = await request(`/api/workouts/${encodeURIComponent(second.id)}`, { headers: { cookie } }).then((response) => response.json() as Promise<{ exercises: Array<{ exerciseId: string; name: string; customizationSource: string }> }>);
    expect(future.exercises[0]).toMatchObject({ exerciseId: currentExercise.exerciseId, name: "Agachamento Belt Squat da academia", customizationSource: "preference" });
    const preferenceCount = await env.DB.prepare(`SELECT COUNT(*) count FROM exercise_substitution_preferences
      WHERE athlete_profile_id='athlete:female:initial' AND program_id='program:female-2026:2026.3'`).first<number>("count");
    expect(preferenceCount).toBeGreaterThan(0);
  });

  it("usa hash com salt e rejeita a senha incorreta", async () => {
    const hash = await hashPassword("uma-senha-de-teste-bem-longa");
    expect(hash).toMatch(/^pbkdf2_sha256\$100000\$/);
    expect(hash).not.toContain("uma-senha-de-teste-bem-longa");
    expect(await verifyPassword("uma-senha-de-teste-bem-longa", hash)).toBe(true);
    expect(await verifyPassword("senha-incorreta", hash)).toBe(false);
    await expect(verifyPassword("qualquer-senha", "pbkdf2_sha256$600000$cEhL7pCjtsP0Zv8X6O02Vg$6PLgVo1u8PNZwqg2OEo1S5xKYxbPJUw0DlxkD6ldNCk")).resolves.toBe(false);
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
      WHERE e.slug='puxada-neutra' AND b.block_number=1
        AND p.id IN ('program:male-2026:2026.2','program:female-2026:2026.3')
      ORDER BY p.program_key`).all<{ programKey: string; displayName: string }>();
    expect(names.results).toContainEqual({ programKey: "male-2026", displayName: "Puxada Articulada ou Vertical Neutra" });
    expect(names.results).toContainEqual({ programKey: "female-2026", displayName: "Puxada Alta Neutra" });
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

  it("prepara uma ficha futura ao abrir um dia do calendário", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const day = await env.DB.prepare(`SELECT d.id FROM training_days d JOIN training_blocks b ON b.id=d.block_id
      WHERE b.program_id='program:male-2026:2026.2' AND b.block_number=1 AND d.weekday=1 LIMIT 1`).first<{ id: string }>();
    expect(day).not.toBeNull();
    const assignment = await env.DB.prepare(`SELECT effective_from effectiveFrom FROM athlete_program_assignments
      WHERE athlete_profile_id='athlete:male:initial' AND program_id='program:male-2026:2026.2'`).first<{ effectiveFrom: string }>();
    const firstMonday = isoWeekday(assignment!.effectiveFrom, 1, 1);
    const nextMondayDate = new Date(`${firstMonday}T12:00:00Z`);
    nextMondayDate.setUTCDate(nextMondayDate.getUTCDate() + 7);
    const nextMonday = nextMondayDate.toISOString().slice(0, 10);
    const nextTuesdayDate = new Date(`${nextMonday}T12:00:00Z`);
    nextTuesdayDate.setUTCDate(nextTuesdayDate.getUTCDate() + 1);
    const nextTuesday = nextTuesdayDate.toISOString().slice(0, 10);
    const response = await request("/api/workouts/prepare", {
      method: "POST",
      headers: { cookie: maleCookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ trainingDayId: day!.id, scheduledDate: firstMonday, originalDate: firstMonday }),
    });
    expect(response.status).toBe(201);
    const prepared = await response.json() as { id: string };
    const workout = await request(`/api/workouts/${encodeURIComponent(prepared.id)}`, { headers: { cookie: maleCookie } });
    expect(workout.status).toBe(200);
    expect((await workout.json() as { exercises: unknown[] }).exercises.length).toBeGreaterThan(0);
    const forbidden = await request("/api/workouts/prepare", {
      method: "POST",
      headers: { cookie: femaleCookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ trainingDayId: day!.id, scheduledDate: firstMonday, originalDate: firstMonday }),
    });
    expect(forbidden.status).toBe(404);

    const moved = await request("/api/calendar/overrides", {
      method: "POST",
      headers: { cookie: maleCookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ originalDate: nextMonday, newDate: nextTuesday, trainingDayId: day!.id, action: "rescheduled", reason: "Teste", version: null }),
    });
    expect(moved.status).toBe(200);
    const blockedOriginal = await request("/api/workouts/prepare", {
      method: "POST",
      headers: { cookie: maleCookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ trainingDayId: day!.id, scheduledDate: nextMonday, originalDate: nextMonday }),
    });
    expect(blockedOriginal.status).toBe(404);
    const movedArrival = await request("/api/workouts/prepare", {
      method: "POST",
      headers: { cookie: maleCookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ trainingDayId: day!.id, scheduledDate: nextTuesday, originalDate: nextMonday }),
    });
    expect(movedArrival.status).toBe(201);
  });

  it("entrega a ficha completa, inclui sessão parcial anterior e persiste a série confirmada", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const row = await env.DB.prepare(`SELECT d.id dayId,ep.id prescriptionId,ep.exercise_id exerciseId
      FROM training_days d JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      JOIN exercise_prescriptions ep ON ep.training_day_id=d.id
      WHERE p.id='program:male-2026:2026.2' AND b.block_number=1 AND d.weekday=1 AND ep.order_index=1`).first<{ dayId: string; prescriptionId: string; exerciseId: string }>();
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
        VALUES ('integration:set:previous',?,1,50000,8,2,'Execução anterior estável',1)`).bind(previousLogId),
      env.DB.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,notes,completed)
        VALUES ('integration:set:previous:2',?,2,50000,7,2,'',1)`).bind(previousLogId),
      env.DB.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,notes,completed)
        VALUES ('integration:set:previous:3',?,3,50000,6,2,'',1)`).bind(previousLogId),
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES (?,'athlete:male:initial',?,'2026-08-10','2026-08-10','scheduled')`).bind(currentSessionId, row!.dayId),
    ]);

    const workoutResponse = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}`, { headers: { cookie: maleCookie } });
    expect(workoutResponse.status).toBe(200);
    const workout = await workoutResponse.json() as { version: number; exercises: Array<{ prescriptionId: string; exerciseId: string; originalExerciseId: string; originalName: string; replacementPrescriptionId: string | null; customizationVersion: number | null; name: string; sets: number; equipment: string | null; previousSession: null | { scheduledDate: string; sets: Array<{ notes: string }> }; progressionSuggestion: null | { kind: string } }> };
    const exercise = workout.exercises.find((item) => item.prescriptionId === row!.prescriptionId);
    expect(exercise?.equipment).toBe("Barra");
    expect(exercise?.originalExerciseId).toBe(row!.exerciseId);
    expect(exercise?.replacementPrescriptionId).toBeNull();
    expect(exercise?.previousSession?.scheduledDate).toBe("2026-07-20");
    expect(exercise?.previousSession?.sets[0]?.notes).toBe("Execução anterior estável");
    expect(exercise?.progressionSuggestion?.kind).toBe("hold_and_add_reps");

    const customizationTarget = workout.exercises[1]!;
    const alternativesResponse = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}/exercises/${encodeURIComponent(customizationTarget.prescriptionId)}/alternatives`, { headers: { cookie: maleCookie } });
    expect(alternativesResponse.status).toBe(200);
    const alternatives = await alternativesResponse.json() as { alternatives: Array<{ prescriptionId: string; exerciseId: string; name: string }> };
    expect(alternatives.alternatives.length).toBeGreaterThan(0);
    const replacement = alternatives.alternatives[0]!;
    const customizeResponse = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}/exercises/${encodeURIComponent(customizationTarget.prescriptionId)}/customization`, {
      method: "PATCH", headers: { cookie: maleCookie, origin, "content-type": "application/json" }, body: JSON.stringify({ replacementPrescriptionId: replacement.prescriptionId, sets: customizationTarget.sets + 1, version: null }),
    });
    expect(customizeResponse.status).toBe(200);
    const customizedWorkout = await request(`/api/workouts/${encodeURIComponent(currentSessionId)}`, { headers: { cookie: maleCookie } }).then((response) => response.json() as Promise<{ exercises: typeof workout.exercises }>);
    const customized = customizedWorkout.exercises.find((item) => item.prescriptionId === customizationTarget.prescriptionId);
    expect(customized).toMatchObject({ exerciseId: replacement.exerciseId, name: replacement.name, replacementPrescriptionId: replacement.prescriptionId, sets: customizationTarget.sets + 1, customizationVersion: 1 });

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
    expect((await request(`/api/workouts/${encodeURIComponent(currentSessionId)}/exercises/${encodeURIComponent(customizationTarget.prescriptionId)}/alternatives`, { headers: { cookie: femaleCookie } })).status).toBe(404);
    expect((await request(`/api/exercises/${encodeURIComponent(row!.exerciseId)}/history`, { headers: { cookie: femaleCookie } })).status).toBe(404);
  });

  it("não altera automaticamente as fichas atuais dos novos PDFs", async () => {
    const maleCookie = await login(env.MALE_USERNAME, env.MALE_PASSWORD);
    const femaleCookie = await login(env.FEMALE_USERNAME, env.FEMALE_PASSWORD);
    const days = await env.DB.prepare(`SELECT p.id programId,d.id dayId FROM training_days d
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      WHERE b.block_number=1 AND d.weekday=1
        AND p.id IN ('program:male-2026:2026.2','program:female-2026:2026.3')`).all<{ programId: string; dayId: string }>();
    const maleDay = days.results.find((item) => item.programId === "program:male-2026:2026.2")!;
    const femaleDay = days.results.find((item) => item.programId === "program:female-2026:2026.3")!;
    await env.DB.batch([
      env.DB.prepare("UPDATE program_state SET current_week=1,current_block=1,manual_override=1 WHERE athlete_profile_id='athlete:male:initial'"),
      env.DB.prepare("UPDATE program_state SET current_week=1,current_block=1,manual_override=1 WHERE athlete_profile_id='athlete:female:initial'"),
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES ('integration:readaptation:male','athlete:male:initial',?,'2026-01-05','2026-01-05','scheduled')`).bind(maleDay.dayId),
      env.DB.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
        VALUES ('integration:readaptation:female','athlete:female:initial',?,'2026-01-05','2026-01-05','scheduled')`).bind(femaleDay.dayId),
    ]);
    try {
      const male = await request("/api/workouts/integration%3Areadaptation%3Amale", { headers: { cookie: maleCookie } }).then((response) => response.json() as Promise<{ guidance: string | null; exercises: Array<{ sets: number; rirMin: number; rirMax: number }> }>);
      expect(male.guidance).toBeNull();
      expect(male.exercises[0]).toMatchObject({ sets: 3, rirMin: 2, rirMax: 2 });

      const female = await request("/api/workouts/integration%3Areadaptation%3Afemale", { headers: { cookie: femaleCookie } }).then((response) => response.json() as Promise<{ guidance: string | null; exercises: Array<{ sets: number }> }>);
      expect(female.guidance).toBeNull();
      expect(female.exercises[0]?.sets).toBe(4);
    } finally {
      await env.DB.batch([
        env.DB.prepare("UPDATE program_state SET manual_override=0 WHERE athlete_profile_id='athlete:male:initial'"),
        env.DB.prepare("UPDATE program_state SET manual_override=0 WHERE athlete_profile_id='athlete:female:initial'"),
      ]);
    }
  });
});
