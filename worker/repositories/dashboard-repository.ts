export class DashboardRepository {
  constructor(private readonly database: D1Database) {}

  async summary(profileId: string, weekStart: string, weekEnd: string, today: string) {
    const results = await this.database.batch([
      this.database.prepare("SELECT measured_at measuredAt,weight_grams/1000.0 weightKg FROM body_measurements WHERE athlete_profile_id=? AND weight_grams IS NOT NULL ORDER BY measured_at DESC LIMIT 2").bind(profileId),
      this.database.prepare("SELECT scheduled_date scheduledDate,status FROM workout_sessions WHERE athlete_profile_id=? AND scheduled_date BETWEEN ? AND ? ORDER BY scheduled_date").bind(profileId, weekStart, weekEnd),
      this.database.prepare("SELECT scheduled_date scheduledDate,status FROM workout_sessions WHERE athlete_profile_id=? AND scheduled_date<=? ORDER BY scheduled_date DESC LIMIT 52").bind(profileId, today),
      this.database.prepare("SELECT COUNT(*) count FROM workout_sessions WHERE athlete_profile_id=? AND status='completed'").bind(profileId),
    ]);
    const measurements = results[0]!;
    const workouts = results[1]!;
    const history = results[2]!.results.map((row) => row as { scheduledDate: string; status: string });
    let streak = 0;
    for (const item of history) {
      if (item.scheduledDate === today && item.status !== "completed") continue;
      if (item.status !== "completed") break;
      streak += 1;
    }
    return {
      measurements: measurements.results as Record<string, unknown>[],
      workouts: workouts.results as Record<string, unknown>[],
      streak,
      completedTotal: Number((results[3]!.results[0] as { count?: number } | undefined)?.count ?? 0),
    };
  }

  async latestLoads(profileId: string): Promise<Array<{ exerciseId: string; name: string; loadKg: number; reps: number; scheduledDate: string }>> {
    const result = await this.database.prepare(`SELECT el.exercise_id exerciseId,e.name,sl.load_grams/1000.0 loadKg,sl.reps,ws.scheduled_date scheduledDate
      FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN exercises e ON e.id=el.exercise_id
      JOIN workout_sessions ws ON ws.id=el.workout_session_id
      WHERE ws.athlete_profile_id=? AND sl.completed=1 AND sl.load_grams IS NOT NULL AND sl.reps IS NOT NULL
      ORDER BY COALESCE(ws.finished_at,ws.started_at,ws.scheduled_date || 'T00:00:00Z') DESC,sl.set_number DESC LIMIT 120`)
      .bind(profileId).all<{ exerciseId: string; name: string; loadKg: number; reps: number; scheduledDate: string }>();
    const unique = new Map<string, { exerciseId: string; name: string; loadKg: number; reps: number; scheduledDate: string }>();
    for (const row of result.results) if (!unique.has(row.exerciseId)) unique.set(row.exerciseId, row);
    return Array.from(unique.values()).slice(0, 4);
  }

  async gluteMediusFocus(profileId: string, programId: string, blockNumber: number, weekStart: string, weekEnd: string) {
    const program = await this.database.prepare(`SELECT version FROM training_programs WHERE id=? AND athlete_profile_id=? AND program_key='female-2026'`)
      .bind(programId, profileId).first<{ version: string }>();
    if (!program || !["2026.2", "2026.3"].includes(program.version)) return null;
    const results = await this.database.batch([
      this.database.prepare(`SELECT e.id exerciseId,MIN(COALESCE(NULLIF(ep.display_name,''),e.name)) name,SUM(ep.sets) plannedSets
        FROM exercise_prescriptions ep JOIN exercises e ON e.id=ep.exercise_id JOIN training_days d ON d.id=ep.training_day_id
        JOIN training_blocks b ON b.id=d.block_id WHERE b.program_id=? AND b.block_number=? AND ep.direct_glute_medius=1
        GROUP BY e.id ORDER BY MIN(d.weekday)`).bind(programId, blockNumber),
      this.database.prepare(`SELECT COUNT(DISTINCT d.weekday) frequency
        FROM exercise_prescriptions ep JOIN training_days d ON d.id=ep.training_day_id
        JOIN training_blocks b ON b.id=d.block_id WHERE b.program_id=? AND b.block_number=? AND ep.direct_glute_medius=1`)
        .bind(programId, blockNumber),
      this.database.prepare(`SELECT ep.exercise_id exerciseId,COUNT(sl.id) completedSets
        FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN exercise_prescriptions ep ON ep.id=el.exercise_prescription_id
        JOIN workout_sessions ws ON ws.id=el.workout_session_id JOIN training_days d ON d.id=ep.training_day_id
        JOIN training_blocks b ON b.id=d.block_id
        WHERE ws.athlete_profile_id=? AND b.program_id=? AND ep.direct_glute_medius=1 AND sl.completed=1
          AND ws.scheduled_date BETWEEN ? AND ? GROUP BY ep.exercise_id`).bind(profileId, programId, weekStart, weekEnd),
      this.database.prepare(`SELECT ep.exercise_id exerciseId,sl.load_grams/1000.0 loadKg,sl.reps,ws.scheduled_date scheduledDate
        FROM set_logs sl JOIN exercise_logs el ON el.id=sl.exercise_log_id JOIN exercise_prescriptions ep ON ep.id=el.exercise_prescription_id
        JOIN workout_sessions ws ON ws.id=el.workout_session_id JOIN training_days d ON d.id=ep.training_day_id
        JOIN training_blocks b ON b.id=d.block_id WHERE ws.athlete_profile_id=? AND b.program_id=? AND ep.direct_glute_medius=1
          AND sl.completed=1 AND sl.load_grams IS NOT NULL ORDER BY COALESCE(ws.finished_at,ws.started_at,ws.scheduled_date || 'T00:00:00Z') DESC,sl.set_number DESC LIMIT 120`)
        .bind(profileId, programId),
    ]);
    const completed = new Map((results[2]!.results as Array<{ exerciseId: string; completedSets: number }>).map((row) => [row.exerciseId, Number(row.completedSets)]));
    const latest = new Map<string, { loadKg: number; reps: number; scheduledDate: string }>();
    for (const row of results[3]!.results as Array<{ exerciseId: string; loadKg: number; reps: number; scheduledDate: string }>) {
      if (!latest.has(row.exerciseId)) latest.set(row.exerciseId, row);
    }
    const plannedRows = results[0]!.results as Array<{ exerciseId: string; name: string; plannedSets: number }>;
    const frequency = Number((results[1]!.results[0] as { frequency?: number } | undefined)?.frequency ?? 0);
    const exercises = plannedRows.map((row) => ({
      exerciseId: row.exerciseId,
      name: row.name,
      plannedSets: Number(row.plannedSets),
      completedSets: completed.get(row.exerciseId) ?? 0,
      latestPerformance: latest.get(row.exerciseId) ?? null,
    }));
    return {
      title: "Glúteo Médio",
      frequency,
      plannedSets: exercises.reduce((sum, row) => sum + row.plannedSets, 0),
      completedSets: exercises.reduce((sum, row) => sum + row.completedSets, 0),
      exercises,
    };
  }
}
