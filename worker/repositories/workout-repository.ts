import type { ExerciseAlternativeDto, ExerciseAlternativesDto, ExerciseHistoryDto, ExerciseHistoryEntryDto, ExercisePrescriptionDto, WorkoutDto, WorkoutStatus } from "../../shared/api";

interface DayRow {
  id: string;
  name: string;
  description: string;
  duration_min: number | null;
  duration_max: number | null;
}

interface SessionRow extends DayRow {
  session_id: string;
  program_id: string;
  program_version: string;
  program_start_date: string;
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
  original_exercise_id: string;
  original_name: string;
  replacement_prescription_id: string | null;
  replacement_exercise_id: string | null;
  customization_version: number | null;
  customization_source: "session" | "preference" | null;
  preference_version: number | null;
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

function customExerciseIdentity(profileId: string, name: string): { id: string; slug: string } {
  const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "outro-exercicio";
  const normalizedProfile = profileId.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 80);
  const slug = `custom-${normalizedProfile}-${normalizedName}`;
  return { id: `exercise:${slug}`, slug };
}

export class WorkoutRepository {
  constructor(private readonly database: D1Database) {}

  async ensureSession(profileId: string, blockNumber: number, weekday: number, date: string): Promise<string | null> {
    const dayRow = await this.database.prepare(`SELECT d.id,d.name,d.description,d.duration_min,d.duration_max FROM training_days d
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id JOIN athlete_profiles a ON a.current_program_id=p.id
      WHERE a.id=? AND b.block_number=? AND d.weekday=? AND d.type='strength' LIMIT 1`).bind(profileId, blockNumber, weekday).first<DayRow>();
    if (!dayRow) return null;
    return this.ensureSessionForDay(profileId, dayRow.id, date, date);
  }

  async ensureSessionForDay(profileId: string, trainingDayId: string, scheduledDate: string, originalDate: string): Promise<string | null> {
    const owns = await this.database.prepare(`SELECT d.id FROM training_days d JOIN training_blocks b ON b.id=d.block_id
      JOIN athlete_program_assignments apa ON apa.program_id=b.program_id
      WHERE apa.athlete_profile_id=? AND d.id=? AND d.type='strength'
      AND ?>=apa.effective_from AND (apa.effective_to IS NULL OR ?<=apa.effective_to)`)
      .bind(profileId, trainingDayId, originalDate, originalDate).first<{ id: string }>();
    if (!owns) return null;
    const id = `workout:${profileId}:${trainingDayId}:${scheduledDate}`;
    await this.database.prepare(`INSERT INTO workout_sessions (id,athlete_profile_id,training_day_id,scheduled_date,original_scheduled_date,status)
      VALUES (?,?,?,?,?,'scheduled') ON CONFLICT(id) DO NOTHING`).bind(id, profileId, trainingDayId, scheduledDate, originalDate).run();
    await this.database.prepare(`INSERT INTO workout_exercise_customizations
      (workout_session_id,exercise_prescription_id,replacement_prescription_id,replacement_exercise_id,set_count,source)
      SELECT ws.id,ep.id,pref.replacement_prescription_id,pref.replacement_exercise_id,ep.sets,'preference'
      FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id
      JOIN training_days d ON d.id=ep.training_day_id JOIN training_blocks b ON b.id=d.block_id
      JOIN exercise_substitution_preferences pref ON pref.athlete_profile_id=ws.athlete_profile_id
        AND pref.program_id=b.program_id AND pref.source_exercise_id=ep.exercise_id
      WHERE ws.id=? AND ws.athlete_profile_id=? AND ws.scheduled_date>=pref.effective_from
      ON CONFLICT(workout_session_id,exercise_prescription_id) DO NOTHING`).bind(id, profileId).run();
    return id;
  }

  async ensureCalendarSession(profileId: string, trainingDayId: string, scheduledDate: string, originalDate: string): Promise<string | null> {
    const override = await this.database.prepare(`SELECT action,new_date newDate FROM calendar_overrides
      WHERE athlete_profile_id=? AND original_date=? AND (training_day_id=? OR training_day_id IS NULL)
      ORDER BY CASE WHEN training_day_id=? THEN 0 ELSE 1 END LIMIT 1`)
      .bind(profileId, originalDate, trainingDayId, trainingDayId)
      .first<{ action: "rescheduled" | "missed" | "rest"; newDate: string | null }>();
    if (scheduledDate === originalDate && override) return null;
    if (scheduledDate !== originalDate && (override?.action !== "rescheduled" || override.newDate !== scheduledDate)) return null;
    return this.ensureSessionForDay(profileId, trainingDayId, scheduledDate, originalDate);
  }

  async getExerciseAlternatives(profileId: string, sessionId: string, prescriptionId: string): Promise<ExerciseAlternativesDto | null> {
    const original = await this.database.prepare(`SELECT ep.id prescriptionId,ep.exercise_id exerciseId,
      COALESCE(NULLIF(ep.display_name,''),e.name) name,COALESCE(ep.equipment,e.equipment) equipment,
      ep.primary_muscle primaryMuscle,ep.category,b.program_id programId
      FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id
      JOIN exercises e ON e.id=ep.exercise_id JOIN training_days d ON d.id=ep.training_day_id
      JOIN training_blocks b ON b.id=d.block_id
      WHERE ws.id=? AND ws.athlete_profile_id=? AND ep.id=? LIMIT 1`)
      .bind(sessionId, profileId, prescriptionId)
      .first<ExerciseAlternativeDto & { programId: string }>();
    if (!original) return null;

    const result = await this.database.prepare(`SELECT ep.id prescriptionId,ep.exercise_id exerciseId,
      COALESCE(NULLIF(ep.display_name,''),e.name) name,COALESCE(ep.equipment,e.equipment) equipment,
      ep.primary_muscle primaryMuscle,ep.category
      FROM exercise_prescriptions ep JOIN exercises e ON e.id=ep.exercise_id
      JOIN training_days d ON d.id=ep.training_day_id JOIN training_blocks b ON b.id=d.block_id
      WHERE b.program_id=? AND ep.exercise_id<>? AND ep.primary_muscle=?
      ORDER BY CASE WHEN ep.category=? THEN 0 ELSE 1 END,
      ep.order_index,ep.display_name LIMIT 80`)
      .bind(original.programId, original.exerciseId, original.primaryMuscle, original.category)
      .all<ExerciseAlternativeDto>();
    const unique = new Map<string, ExerciseAlternativeDto>();
    for (const item of result.results) {
      if (!unique.has(item.exerciseId)) unique.set(item.exerciseId, item);
    }
    const originalDto: ExerciseAlternativeDto = {
      prescriptionId: original.prescriptionId,
      exerciseId: original.exerciseId,
      name: original.name,
      equipment: original.equipment,
      primaryMuscle: original.primaryMuscle,
      category: original.category,
    };
    return { original: originalDto, alternatives: Array.from(unique.values()).slice(0, 16) };
  }

  async customizeExercise(profileId: string, sessionId: string, prescriptionId: string, input: { replacementPrescriptionId: string | null; customExerciseName: string | null; applyToFuture: boolean; sets: number; version: number | null }): Promise<{ ok: true; version: number } | { ok: false; reason: "not_found" | "conflict" | "locked" | "invalid_replacement" | "set_count_too_low" }> {
    const ownership = await this.database.prepare(`SELECT ws.status,ep.exercise_id originalExerciseId,ep.primary_muscle primaryMuscle,
      ep.category,b.program_id programId,ws.scheduled_date scheduledDate FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id
      JOIN training_days d ON d.id=ep.training_day_id JOIN training_blocks b ON b.id=d.block_id
      WHERE ws.id=? AND ws.athlete_profile_id=? AND ep.id=? LIMIT 1`)
      .bind(sessionId, profileId, prescriptionId)
      .first<{ status: WorkoutStatus; originalExerciseId: string; primaryMuscle: string; category: string; programId: string; scheduledDate: string }>();
    if (!ownership) return { ok: false, reason: "not_found" };
    if (!["scheduled", "rescheduled", "in_progress"].includes(ownership.status)) return { ok: false, reason: "locked" };

    const [existing, logSummary] = await Promise.all([
      this.database.prepare(`SELECT replacement_prescription_id,replacement_exercise_id,set_count,source,version FROM workout_exercise_customizations
        WHERE workout_session_id=? AND exercise_prescription_id=?`).bind(sessionId, prescriptionId)
        .first<{ replacement_prescription_id: string | null; replacement_exercise_id: string | null; set_count: number; source: string; version: number }>(),
      this.database.prepare(`SELECT COALESCE(MAX(sl.set_number),0) maxSet,COALESCE(SUM(sl.completed),0) completedSets
        FROM exercise_logs el LEFT JOIN set_logs sl ON sl.exercise_log_id=el.id
        WHERE el.workout_session_id=? AND el.exercise_prescription_id=?`).bind(sessionId, prescriptionId)
        .first<{ maxSet: number; completedSets: number }>(),
    ]);
    if (existing ? input.version !== existing.version : input.version !== null) return { ok: false, reason: "conflict" };
    if (input.sets < Number(logSummary?.maxSet ?? 0)) return { ok: false, reason: "set_count_too_low" };

    let replacementExerciseId = ownership.originalExerciseId;
    const customName = input.customExerciseName?.trim() || null;
    if (customName) {
      const custom = customExerciseIdentity(profileId, customName);
      await this.database.prepare(`INSERT INTO exercises (id,slug,name,muscle_group,equipment,instructions) VALUES (?,?,?,?,NULL,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,muscle_group=excluded.muscle_group`)
        .bind(custom.id, custom.slug, customName, ownership.primaryMuscle, "Exercício informado pela atleta. Padronize técnica, amplitude e equipamento nas próximas exposições.").run();
      replacementExerciseId = custom.id;
    } else if (input.replacementPrescriptionId) {
      const replacement = await this.database.prepare(`SELECT ep.exercise_id exerciseId FROM exercise_prescriptions ep
        JOIN training_days d ON d.id=ep.training_day_id JOIN training_blocks b ON b.id=d.block_id
        WHERE ep.id=? AND b.program_id=? AND ep.exercise_id<>? AND ep.primary_muscle=? LIMIT 1`)
        .bind(input.replacementPrescriptionId, ownership.programId, ownership.originalExerciseId, ownership.primaryMuscle)
        .first<{ exerciseId: string }>();
      if (!replacement) return { ok: false, reason: "invalid_replacement" };
      replacementExerciseId = replacement.exerciseId;
    }

    const replacementChanged = (existing?.replacement_exercise_id ?? ownership.originalExerciseId) !== replacementExerciseId;
    if (replacementChanged && Number(logSummary?.completedSets ?? 0) > 0) return { ok: false, reason: "locked" };

    const customization = existing
      ? this.database.prepare(`UPDATE workout_exercise_customizations SET replacement_prescription_id=?,replacement_exercise_id=?,set_count=?,source='session',version=version+1,updated_at=CURRENT_TIMESTAMP
          WHERE workout_session_id=? AND exercise_prescription_id=? AND version=?
          AND NOT EXISTS (SELECT 1 FROM exercise_logs count_el JOIN set_logs count_sl ON count_sl.exercise_log_id=count_el.id
            WHERE count_el.workout_session_id=? AND count_el.exercise_prescription_id=? AND count_sl.set_number>?)
          AND (?=0 OR NOT EXISTS (SELECT 1 FROM exercise_logs guard_el JOIN set_logs guard_sl ON guard_sl.exercise_log_id=guard_el.id
            WHERE guard_el.workout_session_id=? AND guard_el.exercise_prescription_id=? AND guard_sl.completed=1))`)
        .bind(input.replacementPrescriptionId, replacementExerciseId === ownership.originalExerciseId ? null : replacementExerciseId, input.sets, sessionId, prescriptionId, existing.version, sessionId, prescriptionId, input.sets, replacementChanged ? 1 : 0, sessionId, prescriptionId)
      : this.database.prepare(`INSERT INTO workout_exercise_customizations (workout_session_id,exercise_prescription_id,replacement_prescription_id,replacement_exercise_id,set_count,source)
          SELECT ?,?,?,?,?, 'session' WHERE NOT EXISTS (SELECT 1 FROM exercise_logs count_el JOIN set_logs count_sl ON count_sl.exercise_log_id=count_el.id
            WHERE count_el.workout_session_id=? AND count_el.exercise_prescription_id=? AND count_sl.set_number>?)
          AND (?=0 OR NOT EXISTS (SELECT 1 FROM exercise_logs guard_el JOIN set_logs guard_sl ON guard_sl.exercise_log_id=guard_el.id
            WHERE guard_el.workout_session_id=? AND guard_el.exercise_prescription_id=? AND guard_sl.completed=1))
          ON CONFLICT(workout_session_id,exercise_prescription_id) DO NOTHING`)
        .bind(sessionId, prescriptionId, input.replacementPrescriptionId, replacementExerciseId === ownership.originalExerciseId ? null : replacementExerciseId, input.sets, sessionId, prescriptionId, input.sets, replacementChanged ? 1 : 0, sessionId, prescriptionId);
    const statements = [customization];
    if (replacementChanged) {
      statements.push(this.database.prepare(`UPDATE exercise_logs SET exercise_id=?,updated_at=CURRENT_TIMESTAMP
        WHERE workout_session_id=? AND exercise_prescription_id=?
        AND NOT EXISTS (SELECT 1 FROM set_logs WHERE exercise_log_id=exercise_logs.id AND completed=1)`)
        .bind(replacementExerciseId, sessionId, prescriptionId));
    }
    if (input.applyToFuture && replacementExerciseId !== ownership.originalExerciseId) {
      statements.push(
        this.database.prepare(`INSERT INTO exercise_substitution_preferences
          (athlete_profile_id,program_id,source_exercise_id,replacement_exercise_id,replacement_prescription_id,effective_from)
          VALUES (?,?,?,?,?,?) ON CONFLICT(athlete_profile_id,program_id,source_exercise_id) DO UPDATE SET
          replacement_exercise_id=excluded.replacement_exercise_id,replacement_prescription_id=excluded.replacement_prescription_id,
          effective_from=excluded.effective_from,version=exercise_substitution_preferences.version+1,updated_at=CURRENT_TIMESTAMP`)
          .bind(profileId, ownership.programId, ownership.originalExerciseId, replacementExerciseId, input.replacementPrescriptionId, ownership.scheduledDate),
        this.database.prepare(`INSERT INTO workout_exercise_customizations
          (workout_session_id,exercise_prescription_id,replacement_prescription_id,replacement_exercise_id,set_count,source)
          SELECT ws.id,ep.id,?,?,ep.sets,'preference' FROM workout_sessions ws
          JOIN training_days d ON d.id=ws.training_day_id JOIN training_blocks b ON b.id=d.block_id
          JOIN exercise_prescriptions ep ON ep.training_day_id=d.id
          WHERE ws.athlete_profile_id=? AND b.program_id=? AND ep.exercise_id=? AND ws.scheduled_date>?
          AND ws.status IN ('scheduled','rescheduled')
          ON CONFLICT(workout_session_id,exercise_prescription_id) DO UPDATE SET
            replacement_prescription_id=excluded.replacement_prescription_id,replacement_exercise_id=excluded.replacement_exercise_id,
            source='preference',version=workout_exercise_customizations.version+1,updated_at=CURRENT_TIMESTAMP
          WHERE workout_exercise_customizations.source='preference'
            AND NOT EXISTS (SELECT 1 FROM exercise_logs el JOIN set_logs sl ON sl.exercise_log_id=el.id
              WHERE el.workout_session_id=workout_exercise_customizations.workout_session_id
                AND el.exercise_prescription_id=workout_exercise_customizations.exercise_prescription_id AND sl.completed=1)`)
          .bind(input.replacementPrescriptionId, replacementExerciseId, profileId, ownership.programId, ownership.originalExerciseId, ownership.scheduledDate),
      );
    } else if (input.applyToFuture) {
      statements.push(
        this.database.prepare(`DELETE FROM exercise_substitution_preferences WHERE athlete_profile_id=? AND program_id=? AND source_exercise_id=?`)
          .bind(profileId, ownership.programId, ownership.originalExerciseId),
        this.database.prepare(`DELETE FROM workout_exercise_customizations WHERE source='preference'
          AND workout_session_id IN (SELECT ws.id FROM workout_sessions ws JOIN training_days d ON d.id=ws.training_day_id
            JOIN training_blocks b ON b.id=d.block_id WHERE ws.athlete_profile_id=? AND b.program_id=? AND ws.scheduled_date>?
              AND ws.status IN ('scheduled','rescheduled'))
          AND exercise_prescription_id IN (SELECT id FROM exercise_prescriptions WHERE exercise_id=?)
          AND NOT EXISTS (SELECT 1 FROM exercise_logs el JOIN set_logs sl ON sl.exercise_log_id=el.id
            WHERE el.workout_session_id=workout_exercise_customizations.workout_session_id
              AND el.exercise_prescription_id=workout_exercise_customizations.exercise_prescription_id AND sl.completed=1)`)
          .bind(profileId, ownership.programId, ownership.scheduledDate, ownership.originalExerciseId),
      );
    }
    const results = await this.database.batch(statements);
    if ((results[0]!.meta.changes ?? 0) !== 1) {
      const higherSet = await this.database.prepare(`SELECT 1 FROM exercise_logs el JOIN set_logs sl ON sl.exercise_log_id=el.id
        WHERE el.workout_session_id=? AND el.exercise_prescription_id=? AND sl.set_number>? LIMIT 1`).bind(sessionId, prescriptionId, input.sets).first();
      if (higherSet) return { ok: false, reason: "set_count_too_low" };
      if (replacementChanged) {
        const completedNow = await this.database.prepare(`SELECT 1 FROM exercise_logs el JOIN set_logs sl ON sl.exercise_log_id=el.id
          WHERE el.workout_session_id=? AND el.exercise_prescription_id=? AND sl.completed=1 LIMIT 1`).bind(sessionId, prescriptionId).first();
        if (completedNow) return { ok: false, reason: "locked" };
      }
      return { ok: false, reason: "conflict" };
    }
    return { ok: true, version: (existing?.version ?? 0) + 1 };
  }

  async getWorkout(profileId: string, sessionId: string): Promise<WorkoutDto | null> {
    const session = await this.database.prepare(`SELECT ws.id session_id,ws.scheduled_date,ws.status,ws.started_at,ws.finished_at,ws.notes,ws.version,
      b.program_id,p.version program_version,COALESCE(apa.effective_from,a.program_start_date) program_start_date,
      b.block_number,d.id,d.name,d.description,d.duration_min,d.duration_max FROM workout_sessions ws
      JOIN athlete_profiles a ON a.id=ws.athlete_profile_id JOIN training_days d ON d.id=ws.training_day_id
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      LEFT JOIN athlete_program_assignments apa ON apa.athlete_profile_id=ws.athlete_profile_id AND apa.program_id=b.program_id
      WHERE ws.id=? AND ws.athlete_profile_id=? LIMIT 1`).bind(sessionId, profileId).first<SessionRow>();
    if (!session) return null;

    const queryResults = await this.database.batch([
      this.database.prepare(`SELECT ep.id prescription_id,COALESCE(wxc.replacement_exercise_id,rep.exercise_id,ep.exercise_id) exercise_id,ep.exercise_id original_exercise_id,
        COALESCE(NULLIF(ep.display_name,''),e.name) original_name,wxc.replacement_prescription_id,wxc.replacement_exercise_id,wxc.version customization_version,wxc.source customization_source,pref.version preference_version,
        COALESCE(NULLIF(rep.display_name,''),replacement.name,NULLIF(ep.display_name,''),e.name) name,
        COALESCE(rep.equipment,replacement.equipment,ep.equipment,e.equipment) equipment,
        COALESCE(NULLIF(rep.technique_notes,''),replacement.instructions,NULLIF(ep.technique_notes,''),e.instructions) instructions,
        ep.order_index,COALESCE(wxc.set_count,ep.sets) sets,ep.reps_min,ep.reps_max,ep.reps_label,ep.rir_min,ep.rir_max,ep.rir_direction,
        ep.rest_seconds_min,ep.rest_seconds_max,COALESCE(NULLIF(rep.technique_notes,''),ep.technique_notes) technique_notes,
        COALESCE(NULLIF(rep.progression_notes,''),ep.progression_notes) progression_notes,ep.primary_muscle,ep.secondary_muscles,ep.category,ep.requires_selection,
        el.id log_id,el.completed log_completed,el.technique_confirmed,el.notes log_notes,el.version log_version
        FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id JOIN exercises e ON e.id=ep.exercise_id
        JOIN training_days d ON d.id=ep.training_day_id JOIN training_blocks b ON b.id=d.block_id
        LEFT JOIN workout_exercise_customizations wxc ON wxc.workout_session_id=ws.id AND wxc.exercise_prescription_id=ep.id
        LEFT JOIN exercise_prescriptions rep ON rep.id=wxc.replacement_prescription_id
        LEFT JOIN exercises replacement ON replacement.id=COALESCE(wxc.replacement_exercise_id,rep.exercise_id)
        LEFT JOIN exercise_substitution_preferences pref ON pref.athlete_profile_id=ws.athlete_profile_id AND pref.program_id=b.program_id AND pref.source_exercise_id=ep.exercise_id
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
      originalExerciseId: row.original_exercise_id,
      originalName: row.original_name,
      replacementPrescriptionId: row.replacement_prescription_id,
      customizationVersion: row.customization_version,
      customizationSource: row.customization_source,
      preferenceVersion: row.preference_version,
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
      programId: session.program_id,
      programVersion: session.program_version,
      programStartDate: session.program_start_date,
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
    const ownership = await this.database.prepare(`SELECT COALESCE(wxc.set_count,ep.sets) set_count FROM workout_sessions ws JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id
      LEFT JOIN workout_exercise_customizations wxc ON wxc.workout_session_id=ws.id AND wxc.exercise_prescription_id=ep.id
      WHERE ws.id=? AND ws.athlete_profile_id=? AND ep.id=?`).bind(sessionId, profileId, prescriptionId).first<{ set_count: number }>();
    if (!ownership) return { conflict: true, version: 0 };
    if (input.setNumber > ownership.set_count) return { conflict: true, version: 0 };
    const logId = `exercise-log:${sessionId}:${prescriptionId}`;
    await this.database.prepare(`INSERT INTO exercise_logs (id,workout_session_id,exercise_prescription_id,exercise_id)
      VALUES (?,?,?,(SELECT COALESCE(wxc.replacement_exercise_id,replacement.exercise_id,ep.exercise_id) FROM workout_sessions ws
        JOIN exercise_prescriptions ep ON ep.training_day_id=ws.training_day_id
        LEFT JOIN workout_exercise_customizations wxc ON wxc.workout_session_id=ws.id AND wxc.exercise_prescription_id=ep.id
        LEFT JOIN exercise_prescriptions replacement ON replacement.id=wxc.replacement_prescription_id
        WHERE ws.id=? AND ws.athlete_profile_id=? AND ep.id=? LIMIT 1)) ON CONFLICT(id) DO NOTHING`)
      .bind(logId, sessionId, prescriptionId, sessionId, profileId, prescriptionId).run();
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
    const exercise = await this.database.prepare(`SELECT e.id,
      COALESCE((SELECT COALESCE(NULLIF(ep.display_name,''),e.name) FROM exercise_prescriptions ep
        JOIN training_days d ON d.id=ep.training_day_id JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
        WHERE p.athlete_profile_id=? AND ep.exercise_id=e.id ORDER BY CASE WHEN p.id=(SELECT current_program_id FROM athlete_profiles WHERE id=?) THEN 0 ELSE 1 END,b.block_number,ep.order_index LIMIT 1),e.name) name,
      COALESCE((SELECT ep.primary_muscle FROM exercise_prescriptions ep JOIN training_days d ON d.id=ep.training_day_id
        JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
        WHERE p.athlete_profile_id=? AND ep.exercise_id=e.id LIMIT 1),e.muscle_group) muscleGroup,
      COALESCE((SELECT ep.equipment FROM exercise_prescriptions ep JOIN training_days d ON d.id=ep.training_day_id
        JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
        WHERE p.athlete_profile_id=? AND ep.exercise_id=e.id AND ep.equipment IS NOT NULL LIMIT 1),e.equipment) equipment
      FROM exercises e WHERE e.id=? AND (
        EXISTS (SELECT 1 FROM exercise_prescriptions ep JOIN training_days d ON d.id=ep.training_day_id
          JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id WHERE p.athlete_profile_id=? AND ep.exercise_id=e.id)
        OR EXISTS (SELECT 1 FROM exercise_logs el JOIN workout_sessions ws ON ws.id=el.workout_session_id WHERE ws.athlete_profile_id=? AND el.exercise_id=e.id))`)
      .bind(profileId, profileId, profileId, profileId, exerciseId, profileId, profileId)
      .first<{ id: string; name: string; muscleGroup: string; equipment: string | null }>();
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
