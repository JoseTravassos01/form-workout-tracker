export class CardioRepository {
  constructor(private readonly database: D1Database) {}

  async start(profileId: string, prescriptionId: string, scheduledDate: string, expectedVersion: number | null) {
    const prescription = await this.database.prepare(`SELECT c.id,c.modality FROM cardio_prescriptions c JOIN training_blocks b ON b.id=c.block_id JOIN athlete_profiles a ON a.current_program_id=b.program_id WHERE a.id=? AND c.id=?`).bind(profileId, prescriptionId).first<{ id: string; modality: string }>();
    const personalPlan = prescription ? null : await this.database.prepare(`SELECT id,modality,weekdays FROM personal_cardio_plans
      WHERE athlete_profile_id=? AND id=? AND active=1 AND ? BETWEEN start_date AND end_date`)
      .bind(profileId, prescriptionId, scheduledDate).first<{ id: string; modality: string; weekdays: string }>();
    const isoWeekday = new Date(`${scheduledDate}T12:00:00Z`).getUTCDay() || 7;
    if (!prescription && (!personalPlan || !personalPlan.weekdays.split(",").map(Number).includes(isoWeekday))) return { found: false, conflict: false, id: "", version: 0 };
    const id = `cardio:${profileId}:${prescriptionId}:${scheduledDate}`;
    const existing = await this.database.prepare("SELECT version,status FROM cardio_sessions WHERE id=? AND athlete_profile_id=?").bind(id, profileId).first<{ version: number; status: string }>();
    if (existing) {
      if (expectedVersion !== existing.version) return { found: true, conflict: true, id, version: existing.version };
      const result = await this.database.prepare("UPDATE cardio_sessions SET status='in_progress',started_at=COALESCE(started_at,CURRENT_TIMESTAMP),version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND athlete_profile_id=? AND version=?").bind(id, profileId, existing.version).run();
      return { found: true, conflict: (result.meta.changes ?? 0) !== 1, id, version: existing.version + 1 };
    }
    await this.database.prepare(`INSERT INTO cardio_sessions
      (id,athlete_profile_id,cardio_prescription_id,personal_cardio_plan_id,scheduled_date,started_at,status,modality)
      VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,'in_progress',?)`)
      .bind(id, profileId, prescription?.id ?? null, personalPlan?.id ?? null, scheduledDate, prescription?.modality ?? personalPlan!.modality).run();
    return { found: true, conflict: false, id, version: 1 };
  }

  async complete(profileId: string, sessionId: string, input: { actualDurationMinutes: number; modality: string; actualRpe: number; notes: string; version: number }) {
    const result = await this.database.prepare(`UPDATE cardio_sessions SET status='completed',finished_at=CURRENT_TIMESTAMP,actual_duration_minutes=?,modality=?,actual_rpe=?,notes=?,version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND athlete_profile_id=? AND version=?`).bind(input.actualDurationMinutes, input.modality, input.actualRpe, input.notes, sessionId, profileId, input.version).run();
    return (result.meta.changes ?? 0) === 1;
  }
}
