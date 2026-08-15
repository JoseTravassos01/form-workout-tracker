import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_username_uq").on(table.username)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastUsedAt: text("last_used_at").notNull(),
    userAgentHash: text("user_agent_hash"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uq").on(table.tokenHash),
    index("sessions_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    keyHash: text("key_hash").primaryKey(),
    attempts: integer("attempts").notNull().default(0),
    windowStartedAt: text("window_started_at").notNull(),
    blockedUntil: text("blocked_until"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [check("login_attempts_nonnegative", sql`${table.attempts} >= 0`)],
);

export const athleteProfiles = sqliteTable(
  "athlete_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sex: text("sex").notNull(),
    heightCm: integer("height_cm"),
    currentWeightGrams: integer("current_weight_grams"),
    programStartDate: text("program_start_date").notNull(),
    currentProgramId: text("current_program_id"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    themeKey: text("theme_key").notNull().default("dark"),
    accentColor: text("accent_color").notNull().default("#79f2b0"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("athlete_profiles_user_uq").on(table.userId),
    check("athlete_height_range", sql`${table.heightCm} IS NULL OR ${table.heightCm} BETWEEN 80 AND 260`),
    check("athlete_weight_range", sql`${table.currentWeightGrams} IS NULL OR ${table.currentWeightGrams} BETWEEN 20000 AND 400000`),
  ],
);

export const trainingPrograms = sqliteTable(
  "training_programs",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    key: text("program_key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    sourceResearch: text("source_research").notNull(),
    durationWeeks: integer("duration_weeks").notNull().default(52),
    version: text("version").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    progressionPolicy: text("progression_policy", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    recoveryPolicy: text("recovery_policy", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("training_program_profile_key_version_uq").on(table.athleteProfileId, table.key, table.version),
    index("training_program_profile_active_idx").on(table.athleteProfileId, table.active),
    check("training_program_duration", sql`${table.durationWeeks} > 0`),
  ],
);

export const athleteProgramAssignments = sqliteTable(
  "athlete_program_assignments",
  {
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    programId: text("program_id").notNull().references(() => trainingPrograms.id),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.athleteProfileId, table.programId] }),
    index("athlete_program_assignments_period_idx").on(table.athleteProfileId, table.effectiveFrom, table.effectiveTo),
    check("athlete_program_assignments_period", sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`),
  ],
);

export const trainingBlocks = sqliteTable(
  "training_blocks",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").notNull().references(() => trainingPrograms.id, { onDelete: "cascade" }),
    blockNumber: integer("block_number").notNull(),
    name: text("name").notNull(),
    startWeek: integer("start_week").notNull(),
    endWeek: integer("end_week").notNull(),
    objective: text("objective").notNull(),
    description: text("description").notNull(),
    differences: text("differences").notNull(),
    volumeSummary: text("volume_summary").notNull(),
  },
  (table) => [
    uniqueIndex("training_blocks_program_number_uq").on(table.programId, table.blockNumber),
    check("training_blocks_number", sql`${table.blockNumber} BETWEEN 1 AND 4`),
    check("training_blocks_weeks", sql`${table.startWeek} > 0 AND ${table.endWeek} >= ${table.startWeek}`),
  ],
);

export const trainingDays = sqliteTable(
  "training_days",
  {
    id: text("id").primaryKey(),
    blockId: text("block_id").notNull().references(() => trainingBlocks.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull().default("strength"),
    orderIndex: integer("order_index").notNull(),
    description: text("description").notNull().default(""),
    durationMin: integer("duration_min"),
    durationMax: integer("duration_max"),
  },
  (table) => [
    uniqueIndex("training_days_block_order_uq").on(table.blockId, table.orderIndex),
    uniqueIndex("training_days_block_weekday_uq").on(table.blockId, table.weekday),
    check("training_days_weekday", sql`${table.weekday} BETWEEN 1 AND 7`),
  ],
);

export const exercises = sqliteTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    muscleGroup: text("muscle_group").notNull(),
    equipment: text("equipment"),
    instructions: text("instructions").notNull().default(""),
  },
  (table) => [uniqueIndex("exercises_slug_uq").on(table.slug)],
);

export const exercisePrescriptions = sqliteTable(
  "exercise_prescriptions",
  {
    id: text("id").primaryKey(),
    trainingDayId: text("training_day_id").notNull().references(() => trainingDays.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull().references(() => exercises.id),
    displayName: text("display_name").notNull().default(""),
    equipment: text("equipment"),
    orderIndex: integer("order_index").notNull(),
    sets: integer("sets").notNull(),
    repsMin: integer("reps_min").notNull(),
    repsMax: integer("reps_max").notNull(),
    repsLabel: text("reps_label"),
    rirMin: integer("rir_min").notNull(),
    rirMax: integer("rir_max").notNull(),
    rirDirection: text("rir_direction"),
    restSecondsMin: integer("rest_seconds_min").notNull(),
    restSecondsMax: integer("rest_seconds_max").notNull(),
    techniqueNotes: text("technique_notes").notNull().default(""),
    progressionNotes: text("progression_notes").notNull().default(""),
    primaryMuscle: text("primary_muscle").notNull(),
    secondaryMuscles: text("secondary_muscles").notNull().default(""),
    category: text("category").notNull(),
    isEffectiveSet: integer("is_effective_set", { mode: "boolean" }).notNull().default(true),
    requiresSelection: integer("requires_selection", { mode: "boolean" }).notNull().default(false),
    directGluteMedius: integer("direct_glute_medius", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("exercise_prescriptions_day_order_uq").on(table.trainingDayId, table.orderIndex),
    index("exercise_prescriptions_exercise_idx").on(table.exerciseId),
    check("exercise_prescriptions_sets", sql`${table.sets} BETWEEN 1 AND 20`),
    check("exercise_prescriptions_reps", sql`${table.repsMin} > 0 AND ${table.repsMax} >= ${table.repsMin}`),
    check("exercise_prescriptions_rir", sql`${table.rirMin} BETWEEN 0 AND 10 AND ${table.rirMax} BETWEEN ${table.rirMin} AND 10`),
    check("exercise_prescriptions_rest", sql`${table.restSecondsMin} > 0 AND ${table.restSecondsMax} >= ${table.restSecondsMin}`),
  ],
);

export const exerciseSubstitutionPreferences = sqliteTable(
  "exercise_substitution_preferences",
  {
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    programId: text("program_id").notNull().references(() => trainingPrograms.id),
    sourceExerciseId: text("source_exercise_id").notNull().references(() => exercises.id),
    replacementExerciseId: text("replacement_exercise_id").notNull().references(() => exercises.id),
    replacementPrescriptionId: text("replacement_prescription_id").references(() => exercisePrescriptions.id),
    effectiveFrom: text("effective_from").notNull(),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.athleteProfileId, table.programId, table.sourceExerciseId] }),
    index("exercise_substitution_preferences_replacement_idx").on(table.replacementExerciseId),
    check("exercise_substitution_preferences_distinct", sql`${table.sourceExerciseId} <> ${table.replacementExerciseId}`),
  ],
);

export const cardioPrescriptions = sqliteTable(
  "cardio_prescriptions",
  {
    id: text("id").primaryKey(),
    blockId: text("block_id").notNull().references(() => trainingBlocks.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    modality: text("modality").notNull(),
    durationMin: integer("duration_min").notNull(),
    durationMax: integer("duration_max").notNull(),
    intensity: text("intensity").notNull(),
    rpeMin: integer("rpe_min").notNull(),
    rpeMax: integer("rpe_max").notNull(),
    instructions: text("instructions").notNull(),
    recoveryNotes: text("recovery_notes").notNull(),
    optionalIntervalProtocol: text("optional_interval_protocol"),
  },
  (table) => [
    uniqueIndex("cardio_prescriptions_block_weekday_uq").on(table.blockId, table.weekday),
    check("cardio_prescriptions_weekday", sql`${table.weekday} BETWEEN 1 AND 7`),
    check("cardio_prescriptions_duration", sql`${table.durationMin} > 0 AND ${table.durationMax} >= ${table.durationMin}`),
    check("cardio_prescriptions_rpe", sql`${table.rpeMin} BETWEEN 0 AND 10 AND ${table.rpeMax} BETWEEN ${table.rpeMin} AND 10`),
  ],
);

export const scienceTopics = sqliteTable(
  "science_topics",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").notNull().references(() => trainingPrograms.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [uniqueIndex("science_topics_program_category_uq").on(table.programId, table.category)],
);

export const scienceReferences = sqliteTable(
  "science_references",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").notNull().references(() => trainingPrograms.id, { onDelete: "cascade" }),
    topicCategory: text("topic_category").notNull(),
    title: text("title").notNull(),
    doi: text("doi"),
    pmid: text("pmid"),
    url: text("url").notNull(),
  },
  (table) => [uniqueIndex("science_references_program_url_uq").on(table.programId, table.url)],
);

export const workoutSessions = sqliteTable(
  "workout_sessions",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    trainingDayId: text("training_day_id").notNull().references(() => trainingDays.id),
    scheduledDate: text("scheduled_date").notNull(),
    originalScheduledDate: text("original_scheduled_date").notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    status: text("status").notNull().default("scheduled"),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workout_sessions_profile_day_date_uq").on(table.athleteProfileId, table.trainingDayId, table.scheduledDate),
    index("workout_sessions_profile_date_idx").on(table.athleteProfileId, table.scheduledDate),
    check("workout_sessions_status", sql`${table.status} IN ('scheduled','in_progress','completed','missed','skipped','rescheduled','partial')`),
  ],
);

export const workoutExerciseCustomizations = sqliteTable(
  "workout_exercise_customizations",
  {
    workoutSessionId: text("workout_session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    exercisePrescriptionId: text("exercise_prescription_id").notNull().references(() => exercisePrescriptions.id),
    replacementPrescriptionId: text("replacement_prescription_id").references(() => exercisePrescriptions.id),
    replacementExerciseId: text("replacement_exercise_id").references(() => exercises.id),
    setCount: integer("set_count").notNull(),
    source: text("source").notNull().default("session"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.workoutSessionId, table.exercisePrescriptionId] }),
    index("workout_exercise_customizations_replacement_idx").on(table.replacementPrescriptionId),
    check("workout_exercise_customizations_set_count", sql`${table.setCount} BETWEEN 1 AND 20`),
    check("workout_exercise_customizations_source", sql`${table.source} IN ('session','preference')`),
  ],
);

export const exerciseLogs = sqliteTable(
  "exercise_logs",
  {
    id: text("id").primaryKey(),
    workoutSessionId: text("workout_session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    exercisePrescriptionId: text("exercise_prescription_id").notNull().references(() => exercisePrescriptions.id),
    exerciseId: text("exercise_id").notNull().references(() => exercises.id),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    techniqueConfirmed: integer("technique_confirmed", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("exercise_logs_session_prescription_uq").on(table.workoutSessionId, table.exercisePrescriptionId),
    index("exercise_logs_exercise_idx").on(table.exerciseId),
  ],
);

export const setLogs = sqliteTable(
  "set_logs",
  {
    id: text("id").primaryKey(),
    exerciseLogId: text("exercise_log_id").notNull().references(() => exerciseLogs.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    loadGrams: integer("load_grams"),
    reps: integer("reps"),
    actualRir: integer("actual_rir"),
    notes: text("notes").notNull().default(""),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    idempotencyKey: text("idempotency_key"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("set_logs_exercise_set_uq").on(table.exerciseLogId, table.setNumber),
    uniqueIndex("set_logs_idempotency_uq").on(table.idempotencyKey),
    check("set_logs_set_number", sql`${table.setNumber} BETWEEN 1 AND 20`),
    check("set_logs_load", sql`${table.loadGrams} IS NULL OR ${table.loadGrams} BETWEEN 0 AND 1000000`),
    check("set_logs_reps", sql`${table.reps} IS NULL OR ${table.reps} BETWEEN 0 AND 200`),
    check("set_logs_rir", sql`${table.actualRir} IS NULL OR ${table.actualRir} BETWEEN 0 AND 10`),
  ],
);

export const bodyMeasurements = sqliteTable(
  "body_measurements",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    measuredAt: text("measured_at").notNull(),
    weightGrams: integer("weight_grams"),
    waistMm: integer("waist_mm"),
    hipMm: integer("hip_mm"),
    chestMm: integer("chest_mm"),
    armMm: integer("arm_mm"),
    thighMm: integer("thigh_mm"),
    calfMm: integer("calf_mm"),
    bodyFatBasisPoints: integer("body_fat_basis_points"),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    index("body_measurements_profile_date_idx").on(table.athleteProfileId, table.measuredAt),
    check("body_measurements_weight", sql`${table.weightGrams} IS NULL OR ${table.weightGrams} BETWEEN 20000 AND 400000`),
    check("body_measurements_bodyfat", sql`${table.bodyFatBasisPoints} IS NULL OR ${table.bodyFatBasisPoints} BETWEEN 100 AND 7000`),
  ],
);

export const programState = sqliteTable(
  "program_state",
  {
    athleteProfileId: text("athlete_profile_id").primaryKey().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    currentWeek: integer("current_week").notNull(),
    currentBlock: integer("current_block").notNull(),
    manualOverride: integer("manual_override", { mode: "boolean" }).notNull().default(false),
    version: integer("version").notNull().default(1),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("program_state_week", sql`${table.currentWeek} BETWEEN 1 AND 52`),
    check("program_state_block", sql`${table.currentBlock} BETWEEN 1 AND 4`),
  ],
);

export const programStateHistory = sqliteTable(
  "program_state_history",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    previousWeek: integer("previous_week").notNull(),
    newWeek: integer("new_week").notNull(),
    reason: text("reason").notNull(),
    changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("program_state_history_profile_idx").on(table.athleteProfileId, table.changedAt)],
);

export const calendarOverrides = sqliteTable(
  "calendar_overrides",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    originalDate: text("original_date").notNull(),
    newDate: text("new_date"),
    trainingDayId: text("training_day_id").references(() => trainingDays.id),
    action: text("action").notNull(),
    reason: text("reason").notNull().default(""),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("calendar_overrides_profile_original_day_uq").on(table.athleteProfileId, table.originalDate, table.trainingDayId),
    index("calendar_overrides_profile_new_date_idx").on(table.athleteProfileId, table.newDate),
    check("calendar_overrides_action", sql`${table.action} IN ('rescheduled','missed','rest')`),
  ],
);

export const cardioSessions = sqliteTable(
  "cardio_sessions",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    cardioPrescriptionId: text("cardio_prescription_id").references(() => cardioPrescriptions.id),
    personalCardioPlanId: text("personal_cardio_plan_id"),
    scheduledDate: text("scheduled_date").notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    status: text("status").notNull().default("scheduled"),
    modality: text("modality").notNull(),
    actualDurationMinutes: integer("actual_duration_minutes"),
    actualRpe: integer("actual_rpe"),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    index("cardio_sessions_profile_date_idx").on(table.athleteProfileId, table.scheduledDate),
    check("cardio_sessions_status", sql`${table.status} IN ('scheduled','in_progress','completed','missed','skipped')`),
    check("cardio_sessions_rpe", sql`${table.actualRpe} IS NULL OR ${table.actualRpe} BETWEEN 0 AND 10`),
  ],
);

export const personalCardioPlans = sqliteTable(
  "personal_cardio_plans",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    weekdays: text("weekdays").notNull(),
    modality: text("modality").notNull(),
    durationMin: integer("duration_min").notNull(),
    durationMax: integer("duration_max").notNull(),
    rpeMin: integer("rpe_min").notNull(),
    rpeMax: integer("rpe_max").notNull(),
    notes: text("notes").notNull().default(""),
    recurrenceScope: text("recurrence_scope").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [index("personal_cardio_plans_profile_period_idx").on(table.athleteProfileId, table.startDate, table.endDate, table.active)],
);

export const customProgramPeriods = sqliteTable(
  "custom_program_periods",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    programId: text("program_id").notNull().references(() => trainingPrograms.id),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("custom_program_periods_program_uq").on(table.athleteProfileId, table.programId),
    index("custom_program_periods_profile_period_idx").on(table.athleteProfileId, table.startDate, table.endDate, table.active),
  ],
);

export const hydrationSettings = sqliteTable(
  "hydration_settings",
  {
    athleteProfileId: text("athlete_profile_id").primaryKey().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    dailyGoalMl: integer("daily_goal_ml").notNull().default(2000),
    reminderEnabled: integer("reminder_enabled", { mode: "boolean" }).notNull().default(false),
    reminderTime: text("reminder_time").notNull().default("15:00"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
);

export const hydrationLogs = sqliteTable(
  "hydration_logs",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    loggedAt: text("logged_at").notNull(),
    amountMl: integer("amount_ml").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("hydration_logs_idempotency_uq").on(table.idempotencyKey),
    index("hydration_logs_profile_date_idx").on(table.athleteProfileId, table.localDate, table.loggedAt),
  ],
);

export const aiWorkoutGenerations = sqliteTable(
  "ai_workout_generations",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    durationWeeks: integer("duration_weeks").notNull(),
    promptLength: integer("prompt_length").notNull(),
    status: text("status").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    errorCode: text("error_code"),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("ai_workout_generations_profile_created_idx").on(table.athleteProfileId, table.createdAt),
    check("ai_workout_generations_duration", sql`${table.durationWeeks} IN (4,12)`),
    check("ai_workout_generations_status", sql`${table.status} IN ('pending','completed','failed')`),
  ],
);

export const recoveryCheckins = sqliteTable(
  "recovery_checkins",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    checkedAt: text("checked_at").notNull(),
    performanceDropped: integer("performance_dropped", { mode: "boolean" }).notNull(),
    performanceDropSessions: integer("performance_drop_sessions").notNull().default(0),
    poorSleep: integer("poor_sleep", { mode: "boolean" }).notNull(),
    persistentSoreness: integer("persistent_soreness", { mode: "boolean" }).notNull(),
    jointPain: integer("joint_pain", { mode: "boolean" }).notNull(),
    lowMotivation: integer("low_motivation", { mode: "boolean" }).notNull(),
    highFatigue: integer("high_fatigue", { mode: "boolean" }).notNull(),
    rirLoss: integer("rir_loss", { mode: "boolean" }).notNull(),
    status: text("status").notNull(),
    recommendation: text("recommendation").notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("recovery_checkins_profile_week_uq").on(table.athleteProfileId, table.weekNumber),
    check("recovery_checkins_week", sql`${table.weekNumber} BETWEEN 1 AND 52`),
    check("recovery_checkins_drop_sessions", sql`${table.performanceDropSessions} BETWEEN 0 AND 20`),
    check("recovery_checkins_status", sql`${table.status} IN ('green','yellow','red','pain')`),
  ],
);

export const extraActivities = sqliteTable(
  "extra_activities",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id").notNull().references(() => athleteProfiles.id, { onDelete: "cascade" }),
    activityDate: text("activity_date").notNull(),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes"),
    rpe: integer("rpe"),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("extra_activities_profile_date_idx").on(table.athleteProfileId, table.activityDate)],
);

export const seedRuns = sqliteTable("seed_runs", {
  seedKey: text("seed_key").notNull(),
  seedVersion: text("seed_version").notNull(),
  appliedAt: text("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.seedKey, table.seedVersion] })]);

export type User = typeof users.$inferSelect;
export type AthleteProfile = typeof athleteProfiles.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
