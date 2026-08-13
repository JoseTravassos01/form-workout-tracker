export interface ExtraActivityRow {
  id: string;
  activityDate: string;
  name: string;
  durationMinutes: number | null;
  rpe: number | null;
  notes: string;
  createdAt: string;
}

export class ActivityRepository {
  constructor(private readonly database: D1Database) {}

  async list(profileId: string, from: string, to: string): Promise<ExtraActivityRow[]> {
    const result = await this.database.prepare(`SELECT id,activity_date activityDate,name,duration_minutes durationMinutes,rpe,notes,created_at createdAt
      FROM extra_activities WHERE athlete_profile_id=? AND activity_date BETWEEN ? AND ? ORDER BY activity_date,created_at`)
      .bind(profileId, from, to).all<ExtraActivityRow>();
    return result.results;
  }

  async create(profileId: string, input: { activityDate: string; name: string; durationMinutes: number | null; rpe: number | null; notes: string; idempotencyKey: string }) {
    const id = `activity:${profileId}:${input.idempotencyKey}`;
    const result = await this.database.prepare(`INSERT INTO extra_activities (id,athlete_profile_id,activity_date,name,duration_minutes,rpe,notes)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(id, profileId, input.activityDate, input.name, input.durationMinutes, input.rpe, input.notes).run();
    return { id, created: (result.meta.changes ?? 0) === 1 };
  }
}
