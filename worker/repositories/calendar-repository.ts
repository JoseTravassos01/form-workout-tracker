export interface ScheduleTemplateRow {
  program_id: string;
  effective_from: string;
  effective_to: string | null;
  block_number: number;
  kind: "strength" | "cardio" | "rest";
  id: string;
  weekday: number;
  name: string;
  subtitle: string;
  duration_min: number | null;
  duration_max: number | null;
  rpe_min: number | null;
  rpe_max: number | null;
}

export interface CalendarWorkoutStatusRow { id: string; trainingDayId: string; scheduledDate: string; status: string; version: number }
export interface CalendarCardioStatusRow { id: string; cardioPrescriptionId: string; scheduledDate: string; status: string; version: number }
export interface CalendarOverrideRow { id: string; originalDate: string; newDate: string | null; trainingDayId: string | null; action: "rescheduled" | "missed" | "rest"; reason: string; version: number }

export class CalendarRepository {
  constructor(private readonly database: D1Database) {}

  async getTemplates(profileId: string): Promise<ScheduleTemplateRow[]> {
    const result = await this.database.prepare(`SELECT b.program_id,apa.effective_from,apa.effective_to,b.block_number,
      CASE WHEN d.type='recovery' THEN 'rest' ELSE 'strength' END kind,d.id,d.weekday,d.name,d.description subtitle,d.duration_min,d.duration_max,NULL rpe_min,NULL rpe_max
      FROM training_days d JOIN training_blocks b ON b.id=d.block_id
      JOIN athlete_program_assignments apa ON apa.program_id=b.program_id WHERE apa.athlete_profile_id=?
      UNION ALL SELECT b.program_id,apa.effective_from,apa.effective_to,b.block_number,'cardio' kind,c.id,c.weekday,c.modality name,c.intensity subtitle,c.duration_min,c.duration_max,c.rpe_min,c.rpe_max
      FROM cardio_prescriptions c JOIN training_blocks b ON b.id=c.block_id
      JOIN athlete_program_assignments apa ON apa.program_id=b.program_id WHERE apa.athlete_profile_id=?
      ORDER BY effective_from,block_number,weekday,kind DESC`).bind(profileId, profileId).all<ScheduleTemplateRow>();
    return result.results;
  }

  async getStatuses(profileId: string, from: string, to: string): Promise<{ workouts: CalendarWorkoutStatusRow[]; cardio: CalendarCardioStatusRow[]; overrides: CalendarOverrideRow[] }> {
    const results = await this.database.batch([
      this.database.prepare("SELECT id,training_day_id trainingDayId,scheduled_date scheduledDate,status,version FROM workout_sessions WHERE athlete_profile_id=? AND scheduled_date BETWEEN ? AND ?").bind(profileId, from, to),
      this.database.prepare("SELECT id,cardio_prescription_id cardioPrescriptionId,scheduled_date scheduledDate,status,version FROM cardio_sessions WHERE athlete_profile_id=? AND scheduled_date BETWEEN ? AND ?").bind(profileId, from, to),
      this.database.prepare("SELECT id,original_date originalDate,new_date newDate,training_day_id trainingDayId,action,reason,version FROM calendar_overrides WHERE athlete_profile_id=? AND (original_date BETWEEN ? AND ? OR new_date BETWEEN ? AND ?)").bind(profileId, from, to, from, to),
    ]);
    const workouts = results[0]!;
    const cardio = results[1]!;
    const overrides = results[2]!;
    return {
      workouts: workouts.results.map((row) => row as CalendarWorkoutStatusRow),
      cardio: cardio.results.map((row) => row as CalendarCardioStatusRow),
      overrides: overrides.results.map((row) => row as CalendarOverrideRow),
    };
  }

  async saveOverride(profileId: string, input: { originalDate: string; newDate: string | null; trainingDayId: string | null; action: string; reason: string; version: number | null }): Promise<{ conflict: boolean; id: string; version: number }> {
    if (input.trainingDayId) {
      const owns = await this.database.prepare(`SELECT d.id FROM training_days d JOIN training_blocks b ON b.id=d.block_id
        JOIN athlete_program_assignments apa ON apa.program_id=b.program_id
        WHERE apa.athlete_profile_id=? AND d.id=? AND ?>=apa.effective_from AND (apa.effective_to IS NULL OR ?<=apa.effective_to)`)
        .bind(profileId, input.trainingDayId, input.originalDate, input.originalDate).first();
      if (!owns) return { conflict: true, id: "", version: 0 };
    }
    const existing = await this.database.prepare(`SELECT id,version FROM calendar_overrides WHERE athlete_profile_id=? AND original_date=? AND training_day_id IS ?`).bind(profileId, input.originalDate, input.trainingDayId).first<{ id: string; version: number }>();
    if (existing) {
      if (existing.version !== input.version) return { conflict: true, id: existing.id, version: existing.version };
      const results = await this.database.batch([
        this.database.prepare("UPDATE calendar_overrides SET new_date=?,action=?,reason=?,version=version+1 WHERE id=? AND athlete_profile_id=? AND version=?")
          .bind(input.newDate, input.action, input.reason, existing.id, profileId, existing.version),
        this.database.prepare(`UPDATE workout_sessions SET status=?,version=version+1,updated_at=CURRENT_TIMESTAMP
          WHERE athlete_profile_id=? AND original_scheduled_date=? AND scheduled_date=original_scheduled_date AND (? IS NULL OR training_day_id=?) AND status NOT IN ('in_progress','completed','partial')`)
          .bind(input.action === "rest" ? "skipped" : input.action, profileId, input.originalDate, input.trainingDayId, input.trainingDayId),
      ]);
      return { conflict: (results[0]!.meta.changes ?? 0) !== 1, id: existing.id, version: existing.version + 1 };
    }
    const id = crypto.randomUUID();
    const results = await this.database.batch([
      this.database.prepare(`INSERT INTO calendar_overrides (id,athlete_profile_id,original_date,new_date,training_day_id,action,reason) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(athlete_profile_id,original_date,training_day_id) DO NOTHING`).bind(id, profileId, input.originalDate, input.newDate, input.trainingDayId, input.action, input.reason),
      this.database.prepare(`UPDATE workout_sessions SET status=?,version=version+1,updated_at=CURRENT_TIMESTAMP
        WHERE athlete_profile_id=? AND original_scheduled_date=? AND scheduled_date=original_scheduled_date AND (? IS NULL OR training_day_id=?) AND status NOT IN ('in_progress','completed','partial')`)
        .bind(input.action === "rest" ? "skipped" : input.action, profileId, input.originalDate, input.trainingDayId, input.trainingDayId),
    ]);
    if ((results[0]!.meta.changes ?? 0) === 1) return { conflict: false, id, version: 1 };
    const raced = await this.database.prepare(`SELECT id,version FROM calendar_overrides WHERE athlete_profile_id=? AND original_date=? AND training_day_id IS ?`)
      .bind(profileId, input.originalDate, input.trainingDayId).first<{ id: string; version: number }>();
    return { conflict: true, id: raced?.id ?? "", version: raced?.version ?? 0 };
  }
}
