export interface AiCurrentPrescription {
  weekday: number;
  dayName: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rirMin: number;
  rirMax: number;
  restSecondsMin: number;
  restSecondsMax: number;
}

export interface AiRecentPerformance {
  exerciseName: string;
  lastDate: string;
  maxLoadKg: number | null;
  bestReps: number | null;
  averageRir: number | null;
}

export interface AiCanonicalExercise {
  id: string;
  name: string;
}

export interface AiPlanningContext {
  sex: "male" | "female";
  programName: string;
  programDescription: string;
  programVersion: string;
  currentWeek: number;
  currentBlock: number;
  prescriptions: AiCurrentPrescription[];
  recentPerformance: AiRecentPerformance[];
  canonicalExercises: AiCanonicalExercise[];
}

export type AiGenerationMode = "text" | "pdf";

export interface AiQuotaUsage {
  quotaUsed: number;
  pdfUses: number;
}

interface ProfileRow {
  sex: "male" | "female";
  programName: string;
  programDescription: string;
  programVersion: string;
  currentWeek: number;
  currentBlock: number;
}

export class AiWorkoutRepository {
  constructor(private readonly database: D1Database) {}

  async getPlanningContext(profileId: string): Promise<AiPlanningContext | null> {
    const profile = await this.database.prepare(`SELECT ap.sex,p.name programName,p.description programDescription,p.version programVersion,
      ps.current_week currentWeek,ps.current_block currentBlock
      FROM athlete_profiles ap JOIN training_programs p ON p.id=ap.current_program_id
      JOIN program_state ps ON ps.athlete_profile_id=ap.id
      WHERE ap.id=? AND p.active=1 LIMIT 1`).bind(profileId).first<ProfileRow>();
    if (!profile) return null;

    const results = await this.database.batch([
      this.database.prepare(`SELECT d.weekday,d.name dayName,ep.exercise_id exerciseId,
        COALESCE(NULLIF(ep.display_name,''),e.name) exerciseName,ep.sets,ep.reps_min repsMin,ep.reps_max repsMax,
        ep.rir_min rirMin,ep.rir_max rirMax,ep.rest_seconds_min restSecondsMin,ep.rest_seconds_max restSecondsMax
        FROM athlete_profiles ap JOIN training_programs p ON p.id=ap.current_program_id
        JOIN training_blocks b ON b.program_id=p.id JOIN program_state ps ON ps.athlete_profile_id=ap.id
        JOIN training_days d ON d.block_id=b.id JOIN exercise_prescriptions ep ON ep.training_day_id=d.id
        JOIN exercises e ON e.id=ep.exercise_id
        WHERE ap.id=? AND b.block_number=ps.current_block
        ORDER BY d.order_index,ep.order_index`).bind(profileId),
      this.database.prepare(`SELECT e.name exerciseName,MAX(ws.scheduled_date) lastDate,
        ROUND(MAX(sl.load_grams)/1000.0,2) maxLoadKg,MAX(sl.reps) bestReps,ROUND(AVG(sl.actual_rir),1) averageRir
        FROM workout_sessions ws JOIN exercise_logs el ON el.workout_session_id=ws.id
        JOIN exercises e ON e.id=el.exercise_id JOIN set_logs sl ON sl.exercise_log_id=el.id
        WHERE ws.athlete_profile_id=? AND sl.completed=1
        GROUP BY e.id,e.name ORDER BY lastDate DESC LIMIT 40`).bind(profileId),
      this.database.prepare(`SELECT e.id,e.name FROM exercises e
        WHERE EXISTS (SELECT 1 FROM exercise_prescriptions ep JOIN training_days d ON d.id=ep.training_day_id
          JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
          WHERE p.athlete_profile_id=? AND ep.exercise_id=e.id)
        OR EXISTS (SELECT 1 FROM exercise_logs el JOIN workout_sessions ws ON ws.id=el.workout_session_id
          WHERE ws.athlete_profile_id=? AND el.exercise_id=e.id)
        ORDER BY e.name COLLATE NOCASE LIMIT 160`).bind(profileId, profileId),
    ]);

    return {
      ...profile,
      prescriptions: results[0]!.results as unknown as AiCurrentPrescription[],
      recentPerformance: results[1]!.results as unknown as AiRecentPerformance[],
      canonicalExercises: results[2]!.results as unknown as AiCanonicalExercise[],
    };
  }

  async usageSince(profileId: string, since: string): Promise<AiQuotaUsage> {
    const usage = await this.database.prepare(`SELECT COALESCE(SUM(quota_cost),0) quotaUsed,
      COALESCE(SUM(CASE WHEN generation_mode='pdf' THEN 1 ELSE 0 END),0) pdfUses
      FROM ai_workout_generations WHERE athlete_profile_id=? AND created_at>=?`)
      .bind(profileId, since).first<{ quotaUsed: number; pdfUses: number }>();
    return { quotaUsed: Number(usage?.quotaUsed ?? 0), pdfUses: Number(usage?.pdfUses ?? 0) };
  }

  async reserveGeneration(input: {
    id: string;
    profileId: string;
    model: string;
    durationWeeks: 4 | 12;
    promptLength: number;
    mode: AiGenerationMode;
    quotaCost: 1 | 5;
    documentCount: number;
    documentTextLength: number;
    createdAt: string;
    since: string;
    limit: number;
    pdfLimit: number;
  }): Promise<boolean> {
    const result = await this.database.prepare(`INSERT INTO ai_workout_generations
      (id,athlete_profile_id,model,duration_weeks,prompt_length,generation_mode,quota_cost,document_count,document_text_length,status,created_at)
      SELECT ?,?,?,?,?,?,?,?,?,'pending',?
      WHERE (SELECT COALESCE(SUM(quota_cost),0) FROM ai_workout_generations WHERE athlete_profile_id=? AND created_at>=?) + ? <= ?
        AND (?='text' OR (SELECT COUNT(*) FROM ai_workout_generations WHERE athlete_profile_id=? AND generation_mode='pdf' AND created_at>=?) < ?)`)
      .bind(input.id, input.profileId, input.model, input.durationWeeks, input.promptLength, input.mode, input.quotaCost,
        input.documentCount, input.documentTextLength, input.createdAt, input.profileId, input.since, input.quotaCost,
        input.limit, input.mode, input.profileId, input.since, input.pdfLimit).run();
    return (result.meta.changes ?? 0) === 1;
  }

  async completeGeneration(id: string, profileId: string, inputTokens: number, outputTokens: number, completedAt: string): Promise<void> {
    await this.database.prepare(`UPDATE ai_workout_generations SET status='completed',input_tokens=?,output_tokens=?,completed_at=?
      WHERE id=? AND athlete_profile_id=? AND status='pending'`)
      .bind(inputTokens, outputTokens, completedAt, id, profileId).run();
  }

  async failGeneration(id: string, profileId: string, errorCode: string, completedAt: string): Promise<void> {
    await this.database.prepare(`UPDATE ai_workout_generations SET status='failed',error_code=?,completed_at=?
      WHERE id=? AND athlete_profile_id=? AND status='pending'`)
      .bind(errorCode.slice(0, 80), completedAt, id, profileId).run();
  }
}
