import type { RecoveryAnswers, RecoveryEvaluation } from "../domain/recovery";

export class RecoveryRepository {
  constructor(private readonly database: D1Database) {}

  async save(profileId: string, week: number, answers: RecoveryAnswers, evaluation: RecoveryEvaluation, notes: string) {
    const id = `recovery:${profileId}:${week}`;
    await this.database.prepare(`INSERT INTO recovery_checkins (id,athlete_profile_id,week_number,checked_at,performance_dropped,performance_drop_sessions,poor_sleep,persistent_soreness,joint_pain,low_motivation,high_fatigue,rir_loss,status,recommendation,notes)
      VALUES (?,?,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(athlete_profile_id,week_number) DO UPDATE SET checked_at=CURRENT_TIMESTAMP,performance_dropped=excluded.performance_dropped,performance_drop_sessions=excluded.performance_drop_sessions,poor_sleep=excluded.poor_sleep,persistent_soreness=excluded.persistent_soreness,joint_pain=excluded.joint_pain,low_motivation=excluded.low_motivation,high_fatigue=excluded.high_fatigue,rir_loss=excluded.rir_loss,status=excluded.status,recommendation=excluded.recommendation,notes=excluded.notes`)
      .bind(id, profileId, week, answers.performanceDropped ? 1 : 0, answers.performanceDropSessions, answers.poorSleep ? 1 : 0, answers.persistentSoreness ? 1 : 0, answers.jointPain ? 1 : 0, answers.lowMotivation ? 1 : 0, answers.highFatigue ? 1 : 0, answers.rirLoss ? 1 : 0, evaluation.status, evaluation.recommendation, notes).run();
    return { id, ...evaluation };
  }

  async latest(profileId: string): Promise<Record<string, unknown> | null> {
    return this.database.prepare(`SELECT week_number weekNumber,checked_at checkedAt,performance_dropped performanceDropped,performance_drop_sessions performanceDropSessions,
      poor_sleep poorSleep,persistent_soreness persistentSoreness,joint_pain jointPain,low_motivation lowMotivation,high_fatigue highFatigue,rir_loss rirLoss,status,recommendation,notes
      FROM recovery_checkins WHERE athlete_profile_id=? ORDER BY checked_at DESC LIMIT 1`).bind(profileId).first<Record<string, unknown>>();
  }
}
