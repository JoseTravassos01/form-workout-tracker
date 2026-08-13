import type { ProgramSeed } from "../data/programs";

export interface SeedAccount {
  userId: string;
  profileId: string;
  username: string;
  passwordHash: string;
  displayName: string;
  programStartDate: string;
  program: ProgramSeed;
}

function programId(account: SeedAccount): string {
  return `program:${account.program.key}:${account.program.version}`;
}

export class SeedRepository {
  constructor(private readonly database: D1Database) {}

  async seedAccount(account: SeedAccount): Promise<{ statements: number; programId: string }> {
    const statements: D1PreparedStatement[] = [];
    const program = account.program;
    const currentProgramId = programId(account);

    statements.push(
      this.database.prepare(`INSERT INTO users (id,username,password_hash,active) VALUES (?,?,?,1)
        ON CONFLICT(id) DO UPDATE SET username=excluded.username,active=1,updated_at=CURRENT_TIMESTAMP`).bind(account.userId, account.username, account.passwordHash),
      this.database.prepare(`INSERT INTO athlete_profiles (id,user_id,name,sex,height_cm,current_weight_grams,program_start_date,timezone,theme_key,accent_color)
        VALUES (?,?,?,?,?,?,?,'America/Sao_Paulo',?,?)
        ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,name=excluded.name,sex=excluded.sex,height_cm=excluded.height_cm,current_weight_grams=COALESCE(athlete_profiles.current_weight_grams,excluded.current_weight_grams),theme_key=excluded.theme_key,accent_color=excluded.accent_color,updated_at=CURRENT_TIMESTAMP`)
        .bind(account.profileId, account.userId, account.displayName, program.profile.sex, program.profile.heightCm ?? null, program.profile.currentWeightGrams ?? null, account.programStartDate, program.profile.themeKey, program.profile.accentColor),
      this.database.prepare(`INSERT INTO training_programs (id,athlete_profile_id,program_key,name,description,source_research,duration_weeks,version,active,progression_policy,recovery_policy)
        VALUES (?,?,?,?,?,?,52,?,1,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,source_research=excluded.source_research,active=1,progression_policy=excluded.progression_policy,recovery_policy=excluded.recovery_policy`)
        .bind(currentProgramId, account.profileId, program.key, program.name, program.description, program.sourceResearch, program.version, JSON.stringify(program.progressionPolicy), JSON.stringify(program.recoveryPolicy)),
    );

    for (const block of program.blocks) {
      const blockId = `${currentProgramId}:block:${block.number}`;
      statements.push(this.database.prepare(`INSERT INTO training_blocks (id,program_id,block_number,name,start_week,end_week,objective,description,differences,volume_summary)
        VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,start_week=excluded.start_week,end_week=excluded.end_week,objective=excluded.objective,description=excluded.description,differences=excluded.differences,volume_summary=excluded.volume_summary`)
        .bind(blockId, currentProgramId, block.number, block.name, block.weeks[0], block.weeks[1], block.objective, block.description, block.differences, block.volumeSummary));

      for (const [dayIndex, trainingDay] of block.days.entries()) {
        const dayId = `${blockId}:day:${trainingDay.weekday}`;
        statements.push(this.database.prepare(`INSERT INTO training_days (id,block_id,weekday,name,type,order_index,description,duration_min,duration_max)
          VALUES (?,?,?,?,'strength',?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,order_index=excluded.order_index,description=excluded.description,duration_min=excluded.duration_min,duration_max=excluded.duration_max`)
          .bind(dayId, blockId, trainingDay.weekday, trainingDay.name, dayIndex + 1, trainingDay.description, trainingDay.duration?.[0] ?? null, trainingDay.duration?.[1] ?? null));

        for (const [exerciseIndex, item] of trainingDay.exercises.entries()) {
          const exerciseId = `exercise:${item.slug}`;
          const prescriptionId = `${dayId}:exercise:${exerciseIndex + 1}`;
          statements.push(
            this.database.prepare(`INSERT INTO exercises (id,slug,name,muscle_group,equipment,instructions) VALUES (?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name,muscle_group=excluded.muscle_group,equipment=excluded.equipment,instructions=excluded.instructions`)
              .bind(exerciseId, item.slug, item.name, item.primaryMuscle, item.equipment ?? null, item.techniqueNotes),
            this.database.prepare(`INSERT INTO exercise_prescriptions (id,training_day_id,exercise_id,display_name,equipment,order_index,sets,reps_min,reps_max,reps_label,rir_min,rir_max,rir_direction,rest_seconds_min,rest_seconds_max,technique_notes,progression_notes,primary_muscle,secondary_muscles,category,is_effective_set,requires_selection)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)
              ON CONFLICT(id) DO UPDATE SET exercise_id=excluded.exercise_id,display_name=excluded.display_name,equipment=excluded.equipment,order_index=excluded.order_index,sets=excluded.sets,reps_min=excluded.reps_min,reps_max=excluded.reps_max,reps_label=excluded.reps_label,rir_min=excluded.rir_min,rir_max=excluded.rir_max,rir_direction=excluded.rir_direction,rest_seconds_min=excluded.rest_seconds_min,rest_seconds_max=excluded.rest_seconds_max,technique_notes=excluded.technique_notes,progression_notes=excluded.progression_notes,primary_muscle=excluded.primary_muscle,secondary_muscles=excluded.secondary_muscles,category=excluded.category,requires_selection=excluded.requires_selection`)
              .bind(prescriptionId, dayId, exerciseId, item.name, item.equipment ?? null, exerciseIndex + 1, item.sets, item.reps[0], item.reps[1], item.repsLabel ?? null, item.rir[0], item.rir[1], item.rirDirection ?? null, item.rest[0], item.rest[1], item.techniqueNotes, item.progressionNotes ?? "", item.primaryMuscle, item.secondaryMuscles ?? "", item.category, item.requiresSelection ? 1 : 0),
          );
        }
      }

      for (const item of block.cardio) {
        const cardioId = `${blockId}:cardio:${item.weekday}`;
        statements.push(this.database.prepare(`INSERT INTO cardio_prescriptions (id,block_id,weekday,modality,duration_min,duration_max,intensity,rpe_min,rpe_max,instructions,recovery_notes,optional_interval_protocol)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET modality=excluded.modality,duration_min=excluded.duration_min,duration_max=excluded.duration_max,intensity=excluded.intensity,rpe_min=excluded.rpe_min,rpe_max=excluded.rpe_max,instructions=excluded.instructions,recovery_notes=excluded.recovery_notes,optional_interval_protocol=excluded.optional_interval_protocol`)
          .bind(cardioId, blockId, item.weekday, item.modality, item.duration[0], item.duration[1], item.intensity, item.rpe[0], item.rpe[1], item.instructions, item.recoveryNotes, item.optionalIntervalProtocol ?? null));
      }
    }

    for (const [index, topic] of program.scienceTopics.entries()) {
      statements.push(this.database.prepare(`INSERT INTO science_topics (id,program_id,category,title,summary,order_index) VALUES (?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,order_index=excluded.order_index`)
        .bind(`${currentProgramId}:science:${topic.category}`, currentProgramId, topic.category, topic.title, topic.summary, index + 1));
    }
    for (const [index, reference] of program.references.entries()) {
      statements.push(this.database.prepare(`INSERT INTO science_references (id,program_id,topic_category,title,doi,pmid,url) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET topic_category=excluded.topic_category,title=excluded.title,doi=excluded.doi,pmid=excluded.pmid,url=excluded.url`)
        .bind(`${currentProgramId}:reference:${index + 1}`, currentProgramId, reference.topicCategory, reference.title, reference.doi ?? null, reference.pmid ?? null, reference.url));
    }

    statements.push(
      this.database.prepare("UPDATE athlete_profiles SET current_program_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(currentProgramId, account.profileId),
      this.database.prepare(`INSERT INTO program_state (athlete_profile_id,current_week,current_block,manual_override) VALUES (?,1,1,0)
        ON CONFLICT(athlete_profile_id) DO NOTHING`).bind(account.profileId),
      this.database.prepare(`INSERT INTO seed_runs (seed_key,seed_version) VALUES (?,?) ON CONFLICT(seed_key,seed_version) DO UPDATE SET applied_at=CURRENT_TIMESTAMP`).bind(program.key, program.version),
    );

    await this.database.batch(statements);
    return { statements: statements.length, programId: currentProgramId };
  }
}
