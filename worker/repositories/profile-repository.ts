import type { MeDto } from "../../shared/api";

interface MeRow {
  user_id: string;
  username: string;
  athlete_id: string;
  name: string;
  sex: "male" | "female";
  timezone: string;
  theme_key: string;
  accent_color: string;
  program_start_date: string;
  current_weight_grams: number | null;
}

export class ProfileRepository {
  constructor(private readonly database: D1Database) {}

  async getMe(userId: string): Promise<MeDto | null> {
    const row = await this.database.prepare(`SELECT u.id user_id,u.username,p.id athlete_id,p.name,p.sex,p.timezone,p.theme_key,p.accent_color,p.program_start_date,p.current_weight_grams
      FROM users u JOIN athlete_profiles p ON p.user_id=u.id WHERE u.id=? LIMIT 1`).bind(userId).first<MeRow>();
    if (!row) return null;
    return {
      user: { id: row.user_id, username: row.username },
      athlete: {
        id: row.athlete_id,
        name: row.name,
        sex: row.sex,
        timezone: row.timezone,
        themeKey: row.theme_key,
        accentColor: row.accent_color,
        programStartDate: row.program_start_date,
        currentWeightKg: row.current_weight_grams == null ? null : row.current_weight_grams / 1000,
      },
    };
  }
}
