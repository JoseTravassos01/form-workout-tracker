import { addDays, endOfWeek, format, getISODay, startOfWeek } from "date-fns";
import type { ExercisePrescriptionDto, ProgressionSuggestionDto, StrengthProgressDto, WorkoutDto } from "../../shared/api";
import { dateInTimezone, calculateCurrentBlock, calculateCurrentWeek } from "../domain/program";
import { calculateProgressionSuggestion } from "../domain/progression";
import { DashboardRepository } from "../repositories/dashboard-repository";
import { MeasurementRepository } from "../repositories/measurement-repository";
import { ProgramRepository } from "../repositories/program-repository";
import { RecoveryRepository } from "../repositories/recovery-repository";
import { WorkoutRepository } from "../repositories/workout-repository";
import { CalendarService } from "./calendar-service";

export class TrainingService {
  constructor(private readonly database: D1Database) {}

  private async prepareWorkout(profileId: string, workout: WorkoutDto, currentWeek: number): Promise<WorkoutDto> {
    const [policyRow, recovery] = await Promise.all([
      this.database.prepare(`SELECT p.progression_policy progressionPolicy,p.version programVersion,a.sex profileSex FROM training_programs p
        JOIN athlete_profiles a ON a.id=p.athlete_profile_id WHERE a.id=? AND p.id=? LIMIT 1`).bind(profileId, workout.programId).first<{ progressionPolicy: string; programVersion: string; profileSex: "male" | "female" }>(),
      new RecoveryRepository(this.database).latest(profileId),
    ]);
    let policy: Record<string, unknown> = {};
    try { policy = JSON.parse(policyRow?.progressionPolicy ?? "{}") as Record<string, unknown>; } catch { /* invalid legacy policy: do not invent an increment */ }
    const fatigueSignals = recovery ? ["poorSleep", "persistentSoreness", "lowMotivation", "highFatigue", "rirLoss"]
      .filter((key) => Number(recovery[key]) === 1).length : 0;
    const repeatedPerformanceDrop = Number(recovery?.performanceDropped ?? 0) === 1 && Number(recovery?.performanceDropSessions ?? 0) >= 2;
    let guidance: string | null = null;
    let exercises = workout.exercises;
    if (workout.blockNumber === 1 && currentWeek <= 2 && policyRow?.profileSex === "male" && policyRow.programVersion === "2026.1") {
      guidance = "Readaptação — semanas 1–2: uma série a menos nos exercícios com três ou mais séries e alvo de 3–4 RIR, conforme a pesquisa masculina.";
      exercises = exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.customizationVersion == null && exercise.sets >= 3 ? exercise.sets - 1 : exercise.sets,
        rirMin: 3,
        rirMax: 4,
      }));
    } else if (workout.blockNumber === 1 && currentWeek <= 2 && policyRow?.profileSex === "female" && policyRow.programVersion !== "2026.3") {
      guidance = "Readaptação condicional: se você for iniciante ou estiver voltando de pausa longa, a pesquisa orienta duas séries nos exercícios prescritos com três e 3–4 RIR. Como essa condição é individual, a ficha não foi alterada automaticamente; confirme com o profissional.";
    }
    const totalSets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
    const completedSets = exercises.reduce((total, exercise) => total + Math.min(exercise.sets, exercise.log?.sets.filter((set) => set.completed).length ?? 0), 0);

    return {
      ...workout,
      guidance,
      completionPercent: totalSets === 0 ? 0 : Math.round(completedSets / totalSets * 100),
      exercises: exercises.map((exercise) => ({
        ...exercise,
        progressionSuggestion: this.progressionForExercise(exercise, policy, repeatedPerformanceDrop, fatigueSignals),
      })),
    };
  }

  private progressionForExercise(exercise: ExercisePrescriptionDto, policy: Record<string, unknown>, repeatedPerformanceDrop: boolean, fatigueSignals: number): ProgressionSuggestionDto | null {
    const completedCurrentSets = exercise.log?.sets.filter((set) => set.completed) ?? [];
    const useCurrentExecution = completedCurrentSets.length === exercise.sets;
    const sourceSets = useCurrentExecution ? completedCurrentSets : exercise.previousSession?.sets ?? [];
    if (sourceSets.length !== exercise.sets) return null;

    const maleRange = policy.loadIncreasePercent;
    const femaleRange = policy.loadIncreasePercentCompoundLegs;
    const name = exercise.name.toLocaleLowerCase("pt-BR");
    const isLowerCompound = ["hack", "agach", "leg press", "afundo", "lunge", "búlgar", "bulgar", "romanian", "rdl", "hip thrust", "glute drive"]
      .some((term) => name.includes(term));
    const range = Array.isArray(maleRange) ? maleRange : isLowerCompound && Array.isArray(femaleRange) ? femaleRange : null;
    const loadIncreasePercent = range?.length === 2 && range.every((item) => typeof item === "number")
      ? [range[0] as number, range[1] as number] as const
      : null;
    const suggestion = calculateProgressionSuggestion({
      sets: sourceSets.map((set) => ({ loadKg: set.loadKg ?? 0, reps: set.reps ?? 0, actualRir: set.actualRir ?? 0, completed: set.completed })),
      prescribedSets: exercise.sets,
      repsMin: exercise.repsMin,
      repsMax: exercise.repsMax,
      rirMin: exercise.rirMin,
      rirMax: exercise.rirMax,
      techniqueConfirmed: useCurrentExecution ? exercise.log?.techniqueConfirmed ?? false : exercise.previousSession?.techniqueConfirmed ?? false,
      repeatedPerformanceDrop,
      fatigueSignals,
      loadIncreasePercent,
      useSmallestAvailableIncrement: !loadIncreasePercent && policy.isolatorIncrease === "smallest_available_increment",
    });
    if (suggestion.kind === "insufficient_data") return null;
    if (typeof policy.conservativeAmbiguityResolution === "string") {
      return { ...suggestion, message: `${suggestion.message} A pesquisa feminina também menciona “quase todas as séries”; essa alternativa não virou regra automática e a decisão permanece com você/profissional.` };
    }
    return suggestion;
  }

  async effectiveState(profileId: string, now = new Date()) {
    const context = await new ProgramRepository(this.database).getContext(profileId);
    if (!context) return null;
    const today = dateInTimezone(now, context.timezone);
    const derivedWeek = calculateCurrentWeek(context.program_start_date, today);
    const currentWeek = context.manual_override === 1 ? context.current_week : derivedWeek;
    return { ...context, today, currentWeek, currentBlock: context.manual_override === 1 ? context.current_block : calculateCurrentBlock(currentWeek) };
  }

  async today(profileId: string, now = new Date()): Promise<{ workout: WorkoutDto | null; cardio: Record<string, unknown> | null; state: Record<string, unknown> } | null> {
    const state = await this.effectiveState(profileId, now);
    if (!state) return null;
    const weekday = getISODay(new Date(`${state.today}T12:00:00Z`));
    const workoutRepository = new WorkoutRepository(this.database);
    const overrideResult = await this.database.prepare(`SELECT original_date originalDate,new_date newDate,training_day_id trainingDayId,action
      FROM calendar_overrides WHERE athlete_profile_id=? AND (original_date=? OR new_date=?) ORDER BY created_at DESC`)
      .bind(profileId, state.today, state.today).all<{ originalDate: string; newDate: string | null; trainingDayId: string | null; action: string }>();
    const arrival = overrideResult.results.find((item) => item.action === "rescheduled" && item.newDate === state.today && item.trainingDayId);
    const departure = overrideResult.results.find((item) => item.originalDate === state.today);
    const sessionId = arrival?.trainingDayId
      ? await workoutRepository.ensureSessionForDay(profileId, arrival.trainingDayId, state.today, arrival.originalDate)
      : departure ? null : await workoutRepository.ensureSession(profileId, state.currentBlock, weekday, state.today);
    const baseWorkout = sessionId ? await workoutRepository.getWorkout(profileId, sessionId) : null;
    const workout = baseWorkout ? await this.prepareWorkout(profileId, baseWorkout, state.currentWeek) : null;
    const cardio = await this.database.prepare(`SELECT c.id,c.modality,c.duration_min durationMin,c.duration_max durationMax,c.intensity,c.rpe_min rpeMin,c.rpe_max rpeMax,c.instructions,c.recovery_notes recoveryNotes,c.optional_interval_protocol optionalIntervalProtocol
      FROM cardio_prescriptions c JOIN training_blocks b ON b.id=c.block_id JOIN athlete_profiles a ON a.current_program_id=b.program_id
      WHERE a.id=? AND b.block_number=? AND c.weekday=?`).bind(profileId, state.currentBlock, weekday).first<Record<string, unknown>>();
    return { workout, cardio, state: { week: state.currentWeek, block: state.currentBlock, blockName: await this.blockName(state.program_id, state.currentBlock), today: state.today, programId: state.program_id, programVersion: state.program_version, profileSex: state.profile_sex } };
  }

  private async blockName(programId: string, block: number): Promise<string> {
    return await this.database.prepare("SELECT name FROM training_blocks WHERE program_id=? AND block_number=?").bind(programId, block).first<string>("name") ?? "";
  }

  async workout(profileId: string, sessionId: string): Promise<WorkoutDto | null> {
    const workout = await new WorkoutRepository(this.database).getWorkout(profileId, sessionId);
    if (!workout) return null;
    const sessionWeek = calculateCurrentWeek(workout.programStartDate, workout.scheduledDate);
    return this.prepareWorkout(profileId, workout, sessionWeek);
  }

  async dashboard(profileId: string, now = new Date()) {
    const today = await this.today(profileId, now);
    if (!today) return null;
    const parsed = new Date(`${String(today.state.today)}T12:00:00Z`);
    const todayString = String(today.state.today);
    const weekStart = format(startOfWeek(parsed, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(parsed, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const dashboardRepository = new DashboardRepository(this.database);
    const summary = await dashboardRepository.summary(profileId, weekStart, weekEnd, todayString);
    const [latestRecovery, upcoming, currentCalendar, latestLoads, focus] = await Promise.all([
      new RecoveryRepository(this.database).latest(profileId),
      new CalendarService(this.database).list(profileId, format(addDays(parsed, 1), "yyyy-MM-dd"), format(addDays(parsed, 14), "yyyy-MM-dd")),
      new CalendarService(this.database).list(profileId, weekStart, weekEnd),
      dashboardRepository.latestLoads(profileId),
      dashboardRepository.gluteMediusFocus(profileId, String(today.state.programId), Number(today.state.block), weekStart, weekEnd),
    ]);
    const nextSession = upcoming?.items.find((item) => item.kind !== "rest" && item.kind !== "extra" && !["missed", "rest", "skipped"].includes(String(item.status))) ?? null;
    const weeklyScheduled = currentCalendar?.items.filter((item) => item.kind === "strength" && !["missed", "rest", "skipped"].includes(String(item.status))).length ?? 0;
    return { ...today, weeklyCompleted: summary.workouts.filter((item) => item.status === "completed").length, weeklyScheduled, completedTotal: summary.completedTotal, streak: summary.streak, nextSession, weights: summary.measurements, latestLoads, focus, recovery: latestRecovery };
  }

  async focusSummary(profileId: string, now = new Date()) {
    const state = await this.effectiveState(profileId, now);
    if (!state) return null;
    const parsed = new Date(`${state.today}T12:00:00Z`);
    return new DashboardRepository(this.database).gluteMediusFocus(
      profileId,
      state.program_id,
      state.currentBlock,
      format(startOfWeek(parsed, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      format(endOfWeek(parsed, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    );
  }

  async strength(profileId: string, exerciseId?: string): Promise<StrengthProgressDto | null> {
    const exerciseResult = await this.database.prepare(`SELECT e.id,MIN(COALESCE(NULLIF(ep.display_name,''),e.name)) name FROM exercises e
      JOIN exercise_prescriptions ep ON ep.exercise_id=e.id JOIN training_days d ON d.id=ep.training_day_id
      JOIN training_blocks b ON b.id=d.block_id JOIN training_programs p ON p.id=b.program_id
      WHERE p.athlete_profile_id=? GROUP BY e.id
      UNION SELECT e.id,e.name FROM exercises e JOIN exercise_logs el ON el.exercise_id=e.id
      JOIN workout_sessions ws ON ws.id=el.workout_session_id WHERE ws.athlete_profile_id=?
      ORDER BY name`).bind(profileId, profileId).all<{ id: string; name: string }>();
    const exercises = exerciseResult.results;
    const selected = exercises.some((item) => item.id === exerciseId) ? exerciseId! : exercises[0]?.id ?? "";
    if (!selected) return null;
    const details = await new WorkoutRepository(this.database).getExerciseHistory(profileId, selected);
    return details ? { ...details, exercises, selectedExerciseId: selected } : null;
  }

  measurements(profileId: string) {
    return new MeasurementRepository(this.database).list(profileId);
  }
}
