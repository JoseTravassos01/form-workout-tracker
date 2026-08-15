interface HydrationSettingsInput {
  dailyGoalMl: number;
  reminderEnabled: boolean;
  reminderTime: string;
  version: number | null;
}

export class HydrationRepository {
  constructor(private readonly database: D1Database) {}

  private async ensureSettings(profileId: string) {
    await this.database.prepare(`INSERT INTO hydration_settings (athlete_profile_id) VALUES (?)
      ON CONFLICT(athlete_profile_id) DO NOTHING`).bind(profileId).run();
  }

  async summary(profileId: string, localDate: string) {
    await this.ensureSettings(profileId);
    const [settingsResult, todayResult, historyResult] = await this.database.batch([
      this.database.prepare(`SELECT daily_goal_ml dailyGoalMl,reminder_enabled reminderEnabled,reminder_time reminderTime,version
        FROM hydration_settings WHERE athlete_profile_id=?`).bind(profileId),
      this.database.prepare(`SELECT COALESCE(SUM(amount_ml),0) totalMl FROM hydration_logs
        WHERE athlete_profile_id=? AND local_date=?`).bind(profileId, localDate),
      this.database.prepare(`SELECT local_date localDate,SUM(amount_ml) totalMl FROM hydration_logs
        WHERE athlete_profile_id=? AND local_date BETWEEN date(?,'-13 days') AND ? GROUP BY local_date ORDER BY local_date DESC`).bind(profileId, localDate, localDate),
    ]);
    const settings = settingsResult!.results[0] as { dailyGoalMl: number; reminderEnabled: number; reminderTime: string; version: number };
    return {
      settings: { ...settings, reminderEnabled: settings.reminderEnabled === 1 },
      todayMl: Number((todayResult!.results[0] as { totalMl?: number } | undefined)?.totalMl ?? 0),
      history: historyResult!.results as Array<{ localDate: string; totalMl: number }>,
    };
  }

  async add(profileId: string, input: { localDate: string; loggedAt: string; amountMl: number; idempotencyKey: string }) {
    const id = crypto.randomUUID();
    const result = await this.database.prepare(`INSERT INTO hydration_logs
      (id,athlete_profile_id,local_date,logged_at,amount_ml,idempotency_key) VALUES (?,?,?,?,?,?)
      ON CONFLICT(idempotency_key) DO NOTHING`).bind(id, profileId, input.localDate, input.loggedAt, input.amountMl, input.idempotencyKey).run();
    const totalMl = await this.database.prepare(`SELECT COALESCE(SUM(amount_ml),0) total FROM hydration_logs WHERE athlete_profile_id=? AND local_date=?`)
      .bind(profileId, input.localDate).first<number>("total");
    return { created: (result.meta.changes ?? 0) === 1, totalMl: Number(totalMl ?? 0) };
  }

  async updateSettings(profileId: string, input: HydrationSettingsInput) {
    await this.ensureSettings(profileId);
    const current = await this.database.prepare("SELECT version FROM hydration_settings WHERE athlete_profile_id=?").bind(profileId).first<{ version: number }>();
    if (!current || input.version !== current.version) return { conflict: true, version: current?.version ?? 0 };
    const result = await this.database.prepare(`UPDATE hydration_settings SET daily_goal_ml=?,reminder_enabled=?,reminder_time=?,version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE athlete_profile_id=? AND version=?`).bind(input.dailyGoalMl, input.reminderEnabled ? 1 : 0, input.reminderTime, profileId, current.version).run();
    return { conflict: (result.meta.changes ?? 0) !== 1, version: current.version + 1 };
  }
}
