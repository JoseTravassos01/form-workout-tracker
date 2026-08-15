import { addDays, format, parseISO } from "date-fns";

interface CustomProgramInput {
  name: string;
  durationWeeks: 4 | 12;
  startDate: string;
  idempotencyKey: string;
  days: Array<{
    weekday: number;
    name: string;
    exercises: Array<{ name: string; sets: number; repsMin: number; repsMax: number; rirMin: number; rirMax: number; restSeconds: number; notes: string }>;
  }>;
}

function normalizedSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "exercicio";
}

export class CustomProgramRepository {
  constructor(private readonly database: D1Database) {}

  async create(profileId: string, input: CustomProgramInput) {
    const programId = `custom-program:${profileId}:${input.idempotencyKey}`;
    const existing = await this.database.prepare("SELECT id FROM training_programs WHERE id=? AND athlete_profile_id=?")
      .bind(programId, profileId).first();
    if (existing) return { id: programId, created: false };

    const blockId = `${programId}:block:1`;
    const periodId = `${programId}:period`;
    const endDate = format(addDays(parseISO(input.startDate), input.durationWeeks * 7 - 1), "yyyy-MM-dd");
    const statements: D1PreparedStatement[] = [
      this.database.prepare(`INSERT INTO training_programs
        (id,athlete_profile_id,program_key,name,description,source_research,duration_weeks,version,active,progression_policy,recovery_policy)
        VALUES (?,?,?,?,?,?,?,?,1,?,?)`)
        .bind(programId, profileId, "custom", input.name, "Treino pessoal criado pelo usuário.", "Planejamento pessoal; não substitui o programa científico ativo.", input.durationWeeks, input.idempotencyKey, JSON.stringify({ type: "user_defined" }), JSON.stringify({ type: "user_defined" })),
      this.database.prepare(`INSERT INTO training_blocks
        (id,program_id,block_number,name,start_week,end_week,objective,description,differences,volume_summary)
        VALUES (?,?,1,?,1,?,?,?,?,?)`)
        .bind(blockId, programId, input.name, input.durationWeeks, "Executar o ciclo pessoal conforme planejado.", "Prescrições definidas pelo usuário.", "Ciclo pessoal independente.", "Volume definido pelo usuário."),
      this.database.prepare(`INSERT INTO custom_program_periods (id,athlete_profile_id,program_id,start_date,end_date)
        VALUES (?,?,?,?,?)`).bind(periodId, profileId, programId, input.startDate, endDate),
    ];
    const normalizedProfile = profileId.replace(/[^a-zA-Z0-9]+/g, "-");

    for (const [dayIndex, day] of input.days.entries()) {
      const dayId = `${blockId}:day:${day.weekday}`;
      statements.push(this.database.prepare(`INSERT INTO training_days
        (id,block_id,weekday,name,type,order_index,description,duration_min,duration_max)
        VALUES (?,?,?,?,'strength',?,?,NULL,NULL)`)
        .bind(dayId, blockId, day.weekday, day.name, dayIndex + 1, "Treino pessoal editável criado pelo usuário."));
      for (const [exerciseIndex, exercise] of day.exercises.entries()) {
        const existingExercise = await this.database.prepare(`SELECT id FROM exercises WHERE name=? COLLATE NOCASE
          AND (id NOT LIKE 'exercise:custom-%' OR id LIKE ?) ORDER BY CASE WHEN id LIKE 'exercise:custom-%' THEN 1 ELSE 0 END LIMIT 1`)
          .bind(exercise.name, `exercise:custom-${normalizedProfile}-%`).first<{ id: string }>();
        const exerciseId = existingExercise?.id ?? `exercise:custom-${normalizedProfile}-${normalizedSlug(exercise.name)}`;
        if (!existingExercise) {
          statements.push(this.database.prepare(`INSERT INTO exercises (id,slug,name,muscle_group,equipment,instructions)
            VALUES (?,?,?,?,NULL,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name`)
            .bind(exerciseId, exerciseId.replace(/^exercise:/, ""), exercise.name, "Personalizado", "Exercício definido no treino pessoal. Mantenha técnica e amplitude consistentes."));
        }
        statements.push(this.database.prepare(`INSERT INTO exercise_prescriptions
          (id,training_day_id,exercise_id,display_name,equipment,order_index,sets,reps_min,reps_max,reps_label,rir_min,rir_max,rir_direction,
           rest_seconds_min,rest_seconds_max,technique_notes,progression_notes,primary_muscle,secondary_muscles,category,is_effective_set,requires_selection,direct_glute_medius)
          VALUES (?,?,?,?,NULL,?,?,?,?,NULL,?,?,NULL,?,?,?,?,?,'','custom',1,0,0)`)
          .bind(`${dayId}:exercise:${exerciseIndex + 1}`, dayId, exerciseId, exercise.name, exerciseIndex + 1, exercise.sets, exercise.repsMin, exercise.repsMax,
            exercise.rirMin, exercise.rirMax, exercise.restSeconds, exercise.restSeconds, exercise.notes, "Progrida somente quando cumprir a faixa definida com técnica consistente.", "Personalizado"));
      }
    }
    await this.database.batch(statements);
    return { id: programId, created: true, startDate: input.startDate, endDate };
  }

  async list(profileId: string) {
    const result = await this.database.prepare(`SELECT cp.id,cp.program_id programId,p.name,p.duration_weeks durationWeeks,
      cp.start_date startDate,cp.end_date endDate,cp.active,cp.version,
      (SELECT COUNT(*) FROM training_days d JOIN training_blocks b ON b.id=d.block_id WHERE b.program_id=p.id) dayCount
      FROM custom_program_periods cp JOIN training_programs p ON p.id=cp.program_id
      WHERE cp.athlete_profile_id=? ORDER BY cp.start_date DESC,cp.created_at DESC`).bind(profileId).all();
    return result.results.map((row) => ({ ...row, active: Number(row.active) === 1 }));
  }

  async archive(profileId: string, periodId: string, expectedVersion: number) {
    const result = await this.database.prepare(`UPDATE custom_program_periods SET active=0,version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND athlete_profile_id=? AND version=?`).bind(periodId, profileId, expectedVersion).run();
    return (result.meta.changes ?? 0) === 1;
  }
}
