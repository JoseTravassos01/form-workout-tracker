import { groupWeightByIsoWeek } from "../domain/measurements";

interface MeasurementRow {
  id: string;
  measured_at: string;
  weight_grams: number | null;
  waist_mm: number | null;
  hip_mm: number | null;
  chest_mm: number | null;
  arm_mm: number | null;
  thigh_mm: number | null;
  calf_mm: number | null;
  body_fat_basis_points: number | null;
  notes: string;
  version: number;
}

function mm(value: number | null): number | null {
  return value == null ? null : value / 10;
}

function mapMeasurement(row: MeasurementRow) {
  return {
    id: row.id,
    measuredAt: row.measured_at,
    weightKg: row.weight_grams == null ? null : row.weight_grams / 1000,
    waistCm: mm(row.waist_mm),
    hipCm: mm(row.hip_mm),
    chestCm: mm(row.chest_mm),
    armCm: mm(row.arm_mm),
    thighCm: mm(row.thigh_mm),
    calfCm: mm(row.calf_mm),
    bodyFatPercentage: row.body_fat_basis_points == null ? null : row.body_fat_basis_points / 100,
    notes: row.notes,
    version: row.version,
  };
}

export class MeasurementRepository {
  constructor(private readonly database: D1Database) {}

  async list(profileId: string): Promise<ReturnType<typeof mapMeasurement>[]> {
    const result = await this.database.prepare(`SELECT id,measured_at,weight_grams,waist_mm,hip_mm,chest_mm,arm_mm,thigh_mm,calf_mm,body_fat_basis_points,notes,version
      FROM body_measurements WHERE athlete_profile_id=? ORDER BY measured_at ASC LIMIT 1000`).bind(profileId).all<MeasurementRow>();
    return result.results.map(mapMeasurement);
  }

  async create(profileId: string, input: { idempotencyKey: string; measuredAt: string; weightKg?: number | null; waistCm?: number | null; hipCm?: number | null; chestCm?: number | null; armCm?: number | null; thighCm?: number | null; calfCm?: number | null; bodyFatPercentage?: number | null; notes: string }) {
    const id = `measurement:${profileId}:${input.idempotencyKey}`;
    const result = await this.database.prepare(`INSERT INTO body_measurements (id,athlete_profile_id,measured_at,weight_grams,waist_mm,hip_mm,chest_mm,arm_mm,thigh_mm,calf_mm,body_fat_basis_points,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(
      id, profileId, input.measuredAt,
      input.weightKg == null ? null : Math.round(input.weightKg * 1000),
      input.waistCm == null ? null : Math.round(input.waistCm * 10),
      input.hipCm == null ? null : Math.round(input.hipCm * 10),
      input.chestCm == null ? null : Math.round(input.chestCm * 10),
      input.armCm == null ? null : Math.round(input.armCm * 10),
      input.thighCm == null ? null : Math.round(input.thighCm * 10),
      input.calfCm == null ? null : Math.round(input.calfCm * 10),
      input.bodyFatPercentage == null ? null : Math.round(input.bodyFatPercentage * 100),
      input.notes,
    ).run();
    if ((result.meta.changes ?? 0) === 1 && input.weightKg != null) {
      await this.database.prepare("UPDATE athlete_profiles SET current_weight_grams=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Math.round(input.weightKg * 1000), profileId).run();
    }
    return { id, created: (result.meta.changes ?? 0) === 1 };
  }

  async weightProgress(profileId: string) {
    const list = await this.list(profileId);
    const weights = list.filter((item): item is typeof item & { weightKg: number } => item.weightKg != null);
    const weekly = groupWeightByIsoWeek(weights.map((item) => ({ measuredAt: item.measuredAt, weightKg: item.weightKg })));
    const current = weights.at(-1)?.weightKg ?? null;
    const previous = weights.at(-2)?.weightKg ?? null;
    return { current, previous, difference: current != null && previous != null ? Math.round((current - previous) * 100) / 100 : null, weekly, measurements: weights };
  }
}
