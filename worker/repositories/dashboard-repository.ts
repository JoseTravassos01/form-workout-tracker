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
}
