import type { ExerciseHistoryDto, ExerciseHistoryEntryDto, ExercisePrescriptionDto, WorkoutDto, WorkoutStatus } from "../../shared/api";

interface DayRow {
  id: string;
  name: string;
  description: string;
  duration_min: number | null;
  duration_max: number | null;
}

interface SessionRow extends DayRow {
  session_id: string;
  block_number: number;
  scheduled_date: string;
  status: WorkoutStatus;
  started_at: string | null;
  finished_at: string | null;
  notes: string;
  version: number;
}

interface PrescriptionRow {
  prescription_id: string;
  exercise_id: string;
  name: string;
  equipment: string | null;
  instructions: string;
  order_index: number;
  sets: number;
  reps_min: number;
  reps_max: number;
  reps_label: string | null;
  rir_min: number;
  rir_max: number;
  rir_direction: string | null;
  rest_seconds_min: number;
  rest_seconds_max: number;
  technique_notes: string;
  progression_notes: string;
  primary_muscle: string;
  secondary_muscles: string;
  category: string;
  requires_selection: number;
  log_id: string | null;
  log_completed: number | null;
  technique_confirmed: number | null;
  log_notes: string | null;
  log_version: number | null;
}

interface SetRow {
  id: string;
  exercise_log_id: string;
  set_number: number;
  load_grams: number | null;
  reps: number | null;
  actual_rir: number | null;
  notes: string;
  completed: number;
  version: number;
}

interface PreviousSetRow {
  session_id: string;
  scheduled_date: string;
  exercise_id: string;
  technique_confirmed: number;
  load_grams: number | null;
  reps: number | null;
  actual_rir: number | null;
  set_number: number;
  notes: string;
  completed: number;
}

interface HistoryRow {
  sessionId: string;
  scheduledDate: string;
  status: WorkoutStatus;
  setNumber: number;
  loadKg: number;
  reps: number;
  actualRir: number;
  notes: string;
  volumeKg: number;
}

export class WorkoutRepository {
  constructor(private readonly database: D1Database) {}

  async ensureSession(profileId: string, blockNumber: number, weekday: number, date: string): Promise<string | null> {
    const dayRow = await this.database.prepare(`SELECT d.id,d.name,d.description,d.duration_min,d.duration_max FROM training_days d
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id JOIN athlete_profiles a ON a.current_program_id=p.id
      WHERE a.id=? AND b.block_number=? AND d.weekday=? LIMIT 1`).bind(profileId, blockNumber, weekday).first<DayRow>();
    if (!dayRow) return null;
    return this.ensureSessionForDay(profileId, dayRow.id, date, date);
  }

  async ensureSessionForDay(profileId: string, trainingDayId: string, scheduledDate: string, originalDate: string): Promise<string | null> {
    const owns = await this.database.prepare(`SELECT d.id FROM training_days d JOIN training_blocks b ON b.id=d.block_id
      JOIN athlete_profiles a ON a.current_program_id=b.program_id WHERE a.id=? AND d.id=?`).bind(profileId, trainingDayId).first<{ id: string }>();
    if (!owns) return null;
    const id = `workout:${profileId}:${trainingDayId}:${scheduledDate}`;
    await this.database.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
      VALUES (?,?,?,?,?,'scheduled') ON CONFLICT(id) DO NOTHING`).bind(id, profileId, trainingDayId, scheduledDate, originalDate).run();
    return id;
  }

  async getWorkout(profileId: string, sessionId: string): Promise<WorkoutDto | null> {
    const session = await this.database.prepare(`SELECT ws.id session_id,ws.scheduled_date,ws.status,ws.started_at,ws.finished_at,ws.notes,ws.version,
      b.block_number,d.id,d.name,d.description,d.duration_min,d.duration_max FROM workout_sessions ws JOIN training_days d ON d.id=ws.training_day_id JOIN training_blocks b ON b.id=d.block_id
      WHERE ws.id=? AND ws.athlete_profile_id=? LIMIT 1`).bind(sessionId, profileId).first<SessionRow>();
    if (!session) return null;

    const queryResults = await this.database.batch([
      this.database.prepare(`SELECT ep.id prescription_id,ep.exercise_id,COALESCE(NULLIF(ep.display_name,''),e.name) name,COALESCE(ep.equipment,e.equipment) equipment,ep.technique_notes instructions,ep.order_index,ep.sets,ep.reps_min,ep.reps_max,ep.reps_label,ep.rir_min,ep.rir_max,ep.rir_direction,
        ep.rest_seconds_min,ep.rest_seconds_max,ep.technique_notes,ep.progression_notes,ep.primary_muscle,ep.secondary_muscles,ep.category,ep.requires_selection,
        el.id log_id,el.completed log_completed,el.technique_confirmed,el.notes log_notes,el.version log_version
        FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id JOIN exercises e ON e.id=ep.exercise_id
        LEFT JOIN exercise_logs el ON el.workout_session_id=ws.id AND el.exercise_prescription_id=ep.id
        WHERE ws.id=? AND ws.athlete_profile_id=? ORDER BY ep.order_index`).bind(sessionId, profileId),
      this.database.prepare(`SELECT sl.id,sl.exercise_log_id,sl.set_number,sl.load_grams,sl.reps,sl.actual_rir,sl.notes,sl.completed,sl.version
        FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN workout_sessions ws ON ws.id=el.workout_session_id
        WHERE ws.id=? AND ws.athlete_profile_id=? ORDER BY sl.set_number`).bind(sessionId, profileId),
      this.database.prepare(`SELECT ws.id session_id,ws.scheduled_date,el.exercise_id,el.technique_confirmed,sl.load_grams,sl.reps,sl.actual_rir,sl.set_number,sl.notes,sl.completed FROM set_logs sl
        JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN workout_sessions ws ON ws.id=el.workout_session_id
        WHERE ws.athlete_profile_id=? AND ws.id<>? AND sl.completed=1
        AND ws.id=(SELECT ws2.id FROM workout_sessions ws2
          JOIN exercise_logs el2 ON el2.workout_session_id=ws2.id JOIN set_logs sl2 ON sl2.exercise_log_id=el2.id
          WHERE ws2.athlete_profile_id=? AND ws2.id<>? AND el2.exercise_id=el.exercise_id AND sl2.completed=1
          ORDER BY COALESCE(ws2.finished_at,ws2.started_at,ws2.scheduled_date || 'T00:00:00Z') DESC,ws2.created_at DESC LIMIT 1)
        ORDER BY el.exercise_id,sl.set_number`).bind(profileId, sessionId, profileId, sessionId),
    ]);

    const prescriptions = queryResults[0]!.results.map((row) => row as PrescriptionRow);
    const setRows = queryResults[1]!.results.map((row) => row as SetRow);
    const previousRows = queryResults[2]!.results.map((row) => row as PreviousSetRow);
    const exercises: ExercisePrescriptionDto[] = prescriptions.map((row) => ({
      prescriptionId: row.prescription_id,
      exerciseId: row.exercise_id,
      name: row.name,
      equipment: row.equipment,
      instructions: row.instructions,
      orderIndex: row.order_index,
      sets: row.sets,
      repsMin: row.reps_min,
      repsMax: row.reps_max,
      repsLabel: row.reps_label,
      rirMin: row.rir_min,
      rirMax: row.rir_max,
      rirDirection: row.rir_direction,
      restSecondsMin: row.rest_seconds_min,
      restSecondsMax: row.rest_seconds_max,
      techniqueNotes: row.technique_notes,
      progressionNotes: row.progression_notes,
      primaryMuscle: row.primary_muscle,
      secondaryMuscles: row.secondary_muscles,
      category: row.category,
      requiresSelection: row.requires_selection === 1,
      log: row.log_id ? {
        id: row.log_id,
        completed: row.log_completed === 1,
        techniqueConfirmed: row.technique_confirmed === 1,
        notes: row.log_notes ?? "",
        version: row.log_version ?? 1,
        sets: setRows.filter((set) => set.exercise_log_id === row.log_id).map((set) => ({
          id: set.id,
          setNumber: set.set_number,
          loadKg: set.load_grams == null ? null : set.load_grams / 1000,
          reps: set.reps,
          actualRir: set.actual_rir,
          notes: set.notes,
          completed: set.completed === 1,
          version: set.version,
        })),
      } : null,
      previousSession: (() => {
        const sets = previousRows.filter((set) => set.exercise_id === row.exercise_id);
        const first = sets[0];
        if (!first) return null;
        return {
          sessionId: first.session_id,
          scheduledDate: first.scheduled_date,
          techniqueConfirmed: first.technique_confirmed === 1,
          sets: sets.map((set) => ({
            setNumber: set.set_number,
            loadKg: set.load_grams == null ? null : set.load_grams / 1000,
            reps: set.reps,
            actualRir: set.actual_rir,
            notes: set.notes,
            completed: set.completed === 1,
          })),
        };
      })(),
      previousSets: previousRows.filter((set) => set.exercise_id === row.exercise_id).map((set) => ({
        setNumber: set.set_number,
        loadKg: set.load_grams == null ? null : set.load_grams / 1000,
        reps: set.reps,
        actualRir: set.actual_rir,
        notes: set.notes,
        completed: set.completed === 1,
      })),
      progressionSuggestion: null,
    }));
    const total = exercises.reduce((sum, item) => sum + item.sets, 0);
    const completed = exercises.reduce((sum, item) => sum + Math.min(item.sets, item.log?.sets.filter((set) => set.completed).length ?? 0), 0);
    return {
      id: session.session_id,
      scheduledDate: session.scheduled_date,
      blockNumber: session.block_number,
      name: session.name,
      description: session.description,
      status: session.status,
      startedAt: session.started_at,
      finishedAt: session.finished_at,
      notes: session.notes,
      version: session.version,
      durationMin: session.duration_min,
      durationMax: session.duration_max,
      completionPercent: total === 0 ? 0 : Math.round(completed / total * 100),
      guidance: null,
      exercises,
    };
  }

  async updateSession(profileId: string, sessionId: string, expectedVersion: number, status: "in_progress" | "completed", notes?: string): Promise<boolean> {
    const timestampColumn = status === "in_progress" ? "started_at" : "finished_at";
    const result = await this.database.prepare(`UPDATE workout_sessions SET status=?,${timestampColumn}=COALESCE(${timestampColumn},CURRENT_TIMESTAMP),notes=COALESCE(?,notes),version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND athlete_profile_id=? AND version=?`)
      .bind(status, notes ?? null, sessionId, profileId, expectedVersion).run();
    return (result.meta.changes ?? 0) === 1;
  }

  async finishSession(profileId: string, sessionId: string, expectedVersion: number, status: "completed" | "partial", notes?: string): Promise<{ updated: boolean; status: "completed" | "partial" }> {
    const result = await this.database.prepare(`UPDATE workout_sessions SET status=?,finished_at=COALESCE(finished_at,CURRENT_TIMESTAMP),notes=COALESCE(?,notes),version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND athlete_profile_id=? AND version=? AND status='in_progress'`)
      .bind(status, notes ?? null, sessionId, profileId, expectedVersion).run();
    return { updated: (result.meta.changes ?? 0) === 1, status };
  }

  async saveSet(profileId: string, sessionId: string, prescriptionId: string, input: { setNumber: number; loadKg: number | null; reps: number | null; actualRir: number | null; notes: string; completed: boolean; version: number | null; idempotencyKey: string }): Promise<{ conflict: boolean; version: number }> {
    const ownership = await this.database.prepare(`SELECT ep.exercise_id FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id
      WHERE ws.id=? AND ws.athlete_profile_id=? AND ep.id=?`).bind(sessionId, profileId, prescriptionId).first<{ exercise_id: string }>();
    if (!ownership) return { conflict: true, version: 0 };
    const logId = `exercise-log:${sessionId}:${prescriptionId}`;
    await this.database.prepare(`INSERT INTO exercise_logs (id,workout_session_id,exercise_prescription_id,exercise_id) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING`)
      .bind(logId, sessionId, prescriptionId, ownership.exercise_id).run();
    const existing = await this.database.prepare("SELECT id,version,idempotency_key FROM set_logs WHERE exercise_log_id=? AND set_number=?").bind(logId, input.setNumber).first<{ id: string; version: number; idempotency_key: string | null }>();
    if (existing?.idempotency_key === input.idempotencyKey) return { conflict: false, version: existing.version };
    if (existing) {
      if (input.version !== existing.version) return { conflict: true, version: existing.version };
      const result = await this.database.prepare(`UPDATE set_logs SET load_grams=?,reps=?,actual_rir=?,notes=?,completed=?,idempotency_key=?,version=version+1,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND version=?`).bind(input.loadKg == null ? null : Math.round(input.loadKg * 1000), input.reps, input.actualRir, input.notes, input.completed ? 1 : 0, input.idempotencyKey, existing.id, existing.version).run();
      if ((result.meta.changes ?? 0) !== 1) return { conflict: true, version: existing.version };
      return { conflict: false, version: existing.version + 1 };
    }
    const id = crypto.randomUUID();
    const inserted = await this.database.prepare(`INSERT INTO set_logs (id,exercise_log_id,set_number,load_grams,reps,actual_rir,notes,completed,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(exercise_log_id,set_number) DO NOTHING`)
      .bind(id, logId, input.setNumber, input.loadKg == null ? null : Math.round(input.loadKg * 1000), input.reps, input.actualRir, input.notes, input.completed ? 1 : 0, input.idempotencyKey).run();
    if ((inserted.meta.changes ?? 0) === 1) return { conflict: false, version: 1 };
    const raced = await this.database.prepare("SELECT version,idempotency_key FROM set_logs WHERE exercise_log_id=? AND set_number=?")
      .bind(logId, input.setNumber).first<{ version: number; idempotency_key: string | null }>();
    if (raced?.idempotency_key === input.idempotencyKey) return { conflict: false, version: raced.version };
    return { conflict: true, version: raced?.version ?? 0 };
  }

  async updateExercise(profileId: string, sessionId: string, prescriptionId: string, input: { completed: boolean; techniqueConfirmed: boolean; notes: string; version: number }): Promise<boolean> {
    const result = await this.database.prepare(`UPDATE exercise_logs SET completed=?,technique_confirmed=?,notes=?,version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE id=(SELECT el.id FROM exercise_logs el JOIN workout_sessions ws ON ws.id=el.workout_session_id WHERE ws.id=? AND ws.athlete_profile_id=? AND el.exercise_prescription_id=?) AND version=?`)
      .bind(input.completed ? 1 : 0, input.techniqueConfirmed ? 1 : 0, input.notes, sessionId, profileId, prescriptionId, input.version).run();
    return (result.meta.changes ?? 0) === 1;
  }

  async getExerciseHistory(profileId: string, exerciseId: string): Promise<ExerciseHistoryDto | null> {
    const exercise = await this.database.prepare(`SELECT e.id,COALESCE(NULLIF(ep.display_name,''),e.name) name,ep.primary_muscle muscleGroup,COALESCE(ep.equipment,e.equipment) equipment FROM exercises e
      JOIN exercise_prescriptions ep ON ep.exercise_id=e.id JOIN training_days d ON d.id=ep.training_day_id
      JOIN training_blocks b ON b.id=d.block_id JOIN athlete_profiles a ON a.current_program_id=b.program_id
      WHERE a.id=? AND e.id=? ORDER BY b.block_number,ep.order_index LIMIT 1`).bind(profileId, exerciseId).first<{ id: string; name: string; muscleGroup: string; equipment: string | null }>();
    if (!exercise) return null;

    const [historyResult, summaryResult] = await this.database.batch([
      this.database.prepare(`SELECT ws.id sessionId,ws.scheduled_date scheduledDate,ws.status,sl.set_number setNumber,
        sl.load_grams/1000.0 loadKg,sl.reps,sl.actual_rir actualRir,sl.notes,(sl.load_grams/1000.0)*sl.reps volumeKg
        FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN workout_sessions ws ON ws.id=el.workout_session_id
        WHERE ws.athlete_profile_id=? AND el.exercise_id=? AND sl.completed=1 AND sl.load_grams IS NOT NULL AND sl.reps IS NOT NULL AND sl.actual_rir IS NOT NULL
        ORDER BY COALESCE(ws.finished_at,ws.started_at,ws.scheduled_date || 'T00:00:00Z') DESC,sl.set_number LIMIT 240`).bind(profileId, exerciseId),
      this.database.prepare(`SELECT COALESCE(MAX(sl.load_grams/1000.0),0) bestLoad,COALESCE(MAX(sl.reps),0) bestReps,
        COALESCE(SUM((sl.load_grams/1000.0)*sl.reps),0) volume,COUNT(DISTINCT ws.id) sessionCount
        FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN workout_sessions ws ON ws.id=el.workout_session_id
        WHERE ws.athlete_profile_id=? AND el.exercise_id=? AND sl.completed=1 AND sl.load_grams IS NOT NULL AND sl.reps IS NOT NULL`).bind(profileId, exerciseId),
    ]);
    const history: ExerciseHistoryEntryDto[] = historyResult!.results.map((row) => {
      const item = row as HistoryRow;
      return { ...item };
    });
    const summary = summaryResult!.results[0] as { bestLoad?: number; bestReps?: number; volume?: number; sessionCount?: number } | undefined;
    const sessionGroups = new Map<string, ExerciseHistoryEntryDto[]>();
    for (const item of history) sessionGroups.set(item.sessionId, [...(sessionGroups.get(item.sessionId) ?? []), item]);
    const sessions = Array.from(sessionGroups.values()).map((sets) => ({
      sessionId: sets[0]!.sessionId,
      scheduledDate: sets[0]!.scheduledDate,
      status: sets[0]!.status,
      maxLoadKg: Math.max(...sets.map((set) => set.loadKg)),
      bestReps: Math.max(...sets.map((set) => set.reps)),
      volumeKg: Math.round(sets.reduce((total, set) => total + set.volumeKg, 0) * 100) / 100,
      sets,
    }));
    return {
      exercise,
      history,
      sessions,
      bestLoad: Number(summary?.bestLoad ?? 0),
      bestReps: Number(summary?.bestReps ?? 0),
      volume: Math.round(Number(summary?.volume ?? 0) * 100) / 100,
      sessionCount: Number(summary?.sessionCount ?? 0),
    };
  }
}
