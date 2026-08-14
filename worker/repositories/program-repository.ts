export interface ProgramContextRow {
  program_id: string;
  program_name: string;
  program_description: string;
  source_research: string;
  program_version: string;
  program_key: string;
  profile_sex: "male" | "female";
  program_start_date: string;
  timezone: string;
  current_week: number;
  current_block: number;
  state_version: number;
  manual_override: number;
}

export class ProgramRepository {
  constructor(private readonly database: D1Database) {}

  getContext(profileId: string): Promise<ProgramContextRow | null> {
    return this.database.prepare(`SELECT tp.id program_id,tp.name program_name,tp.description program_description,tp.source_research,tp.version program_version,
      tp.program_key,ap.sex profile_sex,COALESCE(apa.effective_from,ap.program_start_date) program_start_date,ap.timezone,ps.current_week,ps.current_block,ps.version state_version,ps.manual_override
      FROM athlete_profiles ap JOIN training_programs tp ON tp.id=ap.current_program_id JOIN program_state ps ON ps.athlete_profile_id=ap.id
      LEFT JOIN athlete_program_assignments apa ON apa.athlete_profile_id=ap.id AND apa.program_id=tp.id
      WHERE ap.id=? AND tp.active=1 LIMIT 1`).bind(profileId).first<ProgramContextRow>();
  }

  async getBlocks(profileId: string): Promise<Record<string, unknown>[]> {
    const result = await this.database.prepare(`SELECT b.id,b.block_number blockNumber,b.name,b.start_week startWeek,b.end_week endWeek,b.objective,b.description,b.differences,b.volume_summary volumeSummary
      FROM training_blocks b JOIN training_programs p ON p.id=b.program_id JOIN athlete_profiles a ON a.current_program_id=p.id
      WHERE a.id=? ORDER BY b.block_number`).bind(profileId).all<Record<string, unknown>>();
    return result.results;
  }

  async getBlock(profileId: string, blockId: string): Promise<{ block: Record<string, unknown>; days: Record<string, unknown>[] } | null> {
    const block = await this.database.prepare(`SELECT b.id,b.block_number blockNumber,b.name,b.start_week startWeek,b.end_week endWeek,b.objective,b.description,b.differences,b.volume_summary volumeSummary
      FROM training_blocks b JOIN training_programs p ON p.id=b.program_id JOIN athlete_profiles a ON a.current_program_id=p.id WHERE a.id=? AND b.id=?`).bind(profileId, blockId).first<Record<string, unknown>>();
    if (!block) return null;
    const days = await this.database.prepare(`SELECT d.id,d.weekday,d.name,d.description,d.duration_min durationMin,d.duration_max durationMax,COUNT(ep.id) exerciseCount
      FROM training_days d LEFT JOIN exercise_prescriptions ep ON ep.training_day_id=d.id WHERE d.block_id=? GROUP BY d.id ORDER BY d.order_index`).bind(blockId).all<Record<string, unknown>>();
    return { block, days: days.results };
  }

  async getScience(profileId: string): Promise<{ topics: Record<string, unknown>[]; references: Record<string, unknown>[] }> {
    const results = await this.database.batch([
      this.database.prepare(`SELECT s.category,s.title,s.summary FROM science_topics s JOIN athlete_profiles a ON a.current_program_id=s.program_id WHERE a.id=? ORDER BY s.order_index`).bind(profileId),
      this.database.prepare(`SELECT r.topic_category topicCategory,r.title,r.doi,r.pmid,r.url FROM science_references r JOIN athlete_profiles a ON a.current_program_id=r.program_id WHERE a.id=? ORDER BY r.topic_category,r.title`).bind(profileId),
    ]);
    return { topics: results[0]!.results as Record<string, unknown>[], references: results[1]!.results as Record<string, unknown>[] };
  }

  async updateState(profileId: string, currentWeek: number, reason: string, expectedVersion: number): Promise<boolean> {
    const current = await this.database.prepare("SELECT current_week FROM program_state WHERE athlete_profile_id=? AND version=?").bind(profileId, expectedVersion).first<{ current_week: number }>();
    if (!current) return false;
    const block = Math.ceil(currentWeek / 13);
    const id = crypto.randomUUID();
    const results = await this.database.batch([
      this.database.prepare(`INSERT INTO program_state_history (id,athlete_profile_id,previous_week,new_week,reason)
        SELECT ?,athlete_profile_id,current_week,?,? FROM program_state WHERE athlete_profile_id=? AND version=?`)
        .bind(id, currentWeek, reason, profileId, expectedVersion),
      this.database.prepare("UPDATE program_state SET current_week=?,current_block=?,manual_override=1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE athlete_profile_id=? AND version=?").bind(currentWeek, block, profileId, expectedVersion),
    ]);
    return (results[1]?.meta.changes ?? 0) === 1;
  }
}
