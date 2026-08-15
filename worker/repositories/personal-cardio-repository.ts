export interface PersonalCardioPlanRow {
  id: string;
  startDate: string;
  endDate: string;
  weekdays: string;
  modality: string;
  durationMin: number;
  durationMax: number;
  rpeMin: number;
  rpeMax: number;
  notes: string;
  recurrenceScope: "once" | "week" | "month";
  version: number;
}

interface CreatePersonalCardioInput {
  startDate: string;
  endDate: string;
  weekdays: number[];
  modality: string;
  durationMin: number;
  durationMax: number;
  rpeMin: number;
  rpeMax: number;
  notes: string;
  recurrenceScope: "once" | "week" | "month";
  idempotencyKey: string;
}

export class PersonalCardioRepository {
  constructor(private readonly database: D1Database) {}

  async create(profileId: string, input: CreatePersonalCardioInput) {
    const id = `personal-cardio:${profileId}:${input.idempotencyKey}`;
    const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b).join(",");
    const result = await this.database.prepare(`INSERT INTO personal_cardio_plans
      (id,athlete_profile_id,start_date,end_date,weekdays,modality,duration_min,duration_max,rpe_min,rpe_max,notes,recurrence_scope)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
      .bind(id, profileId, input.startDate, input.endDate, weekdays, input.modality, input.durationMin, input.durationMax, input.rpeMin, input.rpeMax, input.notes, input.recurrenceScope).run();
    return { id, created: (result.meta.changes ?? 0) === 1 };
  }

  async list(profileId: string, from: string, to: string): Promise<PersonalCardioPlanRow[]> {
    const result = await this.database.prepare(`SELECT id,start_date startDate,end_date endDate,weekdays,modality,
      duration_min durationMin,duration_max durationMax,rpe_min rpeMin,rpe_max rpeMax,notes,recurrence_scope recurrenceScope,version
      FROM personal_cardio_plans WHERE athlete_profile_id=? AND active=1 AND start_date<=? AND end_date>=? ORDER BY start_date,created_at`)
      .bind(profileId, to, from).all<PersonalCardioPlanRow>();
    return result.results;
  }

  async archive(profileId: string, id: string, expectedVersion: number): Promise<boolean> {
    const result = await this.database.prepare(`UPDATE personal_cardio_plans SET active=0,version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND athlete_profile_id=? AND version=?`).bind(id, profileId, expectedVersion).run();
    return (result.meta.changes ?? 0) === 1;
  }
}
