import { z } from "zod";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const idSchema = z.string().min(3).max(240);
export const versionSchema = z.number().int().positive();

export const setLogSchema = z.object({
  setNumber: z.number().int().min(1).max(20),
  loadKg: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(200).nullable(),
  actualRir: z.number().int().min(0).max(10).nullable(),
  notes: z.string().max(500).default(""),
  completed: z.boolean(),
  version: versionSchema.nullable(),
  idempotencyKey: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (!value.completed) return;
  for (const field of ["loadKg", "reps", "actualRir"] as const) {
    if (value[field] == null) context.addIssue({ code: "custom", message: "Preencha carga, repetições e RIR para concluir a série.", path: [field] });
  }
});

export const completeExerciseSchema = z.object({
  completed: z.boolean(),
  techniqueConfirmed: z.boolean(),
  notes: z.string().max(2000),
  version: versionSchema,
}).strict();

export const prepareWorkoutSchema = z.object({
  trainingDayId: idSchema,
  scheduledDate: isoDateSchema,
  originalDate: isoDateSchema,
}).strict();

export const customizeExerciseSchema = z.object({
  replacementPrescriptionId: idSchema.nullable(),
  customExerciseName: z.string().trim().min(2).max(120).nullable().default(null),
  applyToFuture: z.boolean().default(true),
  sets: z.number().int().min(1).max(20),
  version: versionSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.replacementPrescriptionId && value.customExerciseName) {
    context.addIssue({ code: "custom", message: "Escolha uma recomendação ou informe outro exercício, não os dois.", path: ["customExerciseName"] });
  }
});

export const sessionMutationSchema = z.object({
  version: versionSchema,
  notes: z.string().max(4000).optional(),
}).strict();

const nullableMeasurement = z.number().positive().max(500).nullable().optional();
export const measurementSchema = z.object({
  measuredAt: z.string().datetime({ offset: true }),
  weightKg: z.number().min(20).max(400).nullable().optional(),
  waistCm: nullableMeasurement,
  hipCm: nullableMeasurement,
  chestCm: nullableMeasurement,
  armCm: nullableMeasurement,
  thighCm: nullableMeasurement,
  calfCm: nullableMeasurement,
  bodyFatPercentage: z.number().min(1).max(70).nullable().optional(),
  notes: z.string().max(2000).default(""),
  idempotencyKey: z.string().uuid(),
}).strict().refine((value) => Object.entries(value).some(([key, item]) => key.endsWith("Kg") || key.endsWith("Cm") || key === "bodyFatPercentage" ? item != null : false), { message: "Informe ao menos uma medida." });

export const calendarQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
}).refine(({ from, to }) => from <= to, { message: "Intervalo inválido." });

export const calendarOverrideSchema = z.object({
  originalDate: isoDateSchema,
  newDate: isoDateSchema.nullable(),
  trainingDayId: idSchema.nullable(),
  action: z.enum(["rescheduled", "missed", "rest"]),
  reason: z.string().max(500).default(""),
  version: versionSchema.nullable().default(null),
}).strict().superRefine((value, context) => {
  if (value.action === "rescheduled" && !value.newDate) context.addIssue({ code: "custom", message: "Nova data é obrigatória ao reagendar.", path: ["newDate"] });
});

export const extraActivitySchema = z.object({
  activityDate: isoDateSchema,
  name: z.string().trim().min(2).max(120),
  durationMinutes: z.number().int().min(1).max(600).nullable(),
  rpe: z.number().int().min(0).max(10).nullable(),
  notes: z.string().max(2000).default(""),
  idempotencyKey: z.string().uuid(),
}).strict();

export const programStateSchema = z.object({
  currentWeek: z.number().int().min(1).max(52),
  reason: z.string().min(3).max(500),
  version: versionSchema,
  confirmed: z.literal(true),
}).strict();

export const recoverySchema = z.object({
  performanceDropped: z.boolean(),
  performanceDropSessions: z.number().int().min(0).max(20),
  poorSleep: z.boolean(),
  persistentSoreness: z.boolean(),
  jointPain: z.boolean(),
  lowMotivation: z.boolean(),
  highFatigue: z.boolean(),
  rirLoss: z.boolean(),
  notes: z.string().max(2000).default(""),
}).strict();

export const cardioCompleteSchema = z.object({
  actualDurationMinutes: z.number().int().min(1).max(600),
  modality: z.string().min(1).max(120),
  actualRpe: z.number().int().min(0).max(10),
  notes: z.string().max(2000).default(""),
  version: versionSchema,
}).strict();

export const cardioStartSchema = z.object({
  scheduledDate: isoDateSchema,
  version: versionSchema.nullable().default(null),
}).strict();

export const personalCardioPlanSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  modality: z.string().trim().min(2).max(120),
  durationMin: z.number().int().min(1).max(600),
  durationMax: z.number().int().min(1).max(600),
  rpeMin: z.number().int().min(0).max(10),
  rpeMax: z.number().int().min(0).max(10),
  notes: z.string().max(2000).default(""),
  recurrenceScope: z.enum(["once", "week", "month"]),
  idempotencyKey: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.endDate < value.startDate) context.addIssue({ code: "custom", message: "A data final deve ser igual ou posterior à inicial.", path: ["endDate"] });
  if (value.durationMax < value.durationMin) context.addIssue({ code: "custom", message: "A duração máxima deve ser igual ou maior que a mínima.", path: ["durationMax"] });
  if (value.rpeMax < value.rpeMin) context.addIssue({ code: "custom", message: "O RPE máximo deve ser igual ou maior que o mínimo.", path: ["rpeMax"] });
});

export const hydrationLogSchema = z.object({
  localDate: isoDateSchema,
  loggedAt: z.string().datetime({ offset: true }),
  amountMl: z.number().int().min(1).max(5000),
  idempotencyKey: z.string().uuid(),
}).strict();

export const hydrationSettingsSchema = z.object({
  dailyGoalMl: z.number().int().min(250).max(10000),
  reminderEnabled: z.boolean(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  version: versionSchema.nullable(),
}).strict();

export const customExerciseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sets: z.number().int().min(1).max(20),
  repsMin: z.number().int().min(1).max(200),
  repsMax: z.number().int().min(1).max(200),
  rirMin: z.number().int().min(0).max(10),
  rirMax: z.number().int().min(0).max(10),
  restSeconds: z.number().int().min(15).max(600),
  notes: z.string().max(1000).default(""),
}).strict().superRefine((value, context) => {
  if (value.repsMax < value.repsMin) context.addIssue({ code: "custom", message: "A repetição máxima deve ser igual ou maior que a mínima.", path: ["repsMax"] });
  if (value.rirMax < value.rirMin) context.addIssue({ code: "custom", message: "O RIR máximo deve ser igual ou maior que o mínimo.", path: ["rirMax"] });
});

export const customTrainingDaySchema = z.object({
  weekday: z.number().int().min(1).max(7),
  name: z.string().trim().min(2).max(120),
  exercises: z.array(customExerciseSchema).min(1).max(12),
}).strict();

export const customProgramSchema = z.object({
  name: z.string().trim().min(3).max(120),
  durationWeeks: z.union([z.literal(4), z.literal(12)]),
  startDate: isoDateSchema,
  days: z.array(customTrainingDaySchema).min(1).max(7),
  idempotencyKey: z.string().uuid(),
}).strict().superRefine((value, context) => {
  const weekdays = value.days.map((day) => day.weekday);
  if (new Set(weekdays).size !== weekdays.length) context.addIssue({ code: "custom", message: "Escolha cada dia da semana apenas uma vez.", path: ["days"] });
});

export const aiWorkoutGenerationSchema = z.object({
  prompt: z.string().trim().min(20).max(3000),
  durationWeeks: z.union([z.literal(4), z.literal(12)]),
  startDate: isoDateSchema,
}).strict();

export const aiWorkoutPdfGenerationSchema = z.object({
  prompt: z.string().trim().max(3000).default(""),
  durationWeeks: z.union([z.literal(4), z.literal(12)]),
  startDate: isoDateSchema,
}).strict();

const aiExerciseSchema = customExerciseSchema.safeExtend({
  sets: z.number().int().min(1).max(8),
  repsMax: z.number().int().min(1).max(100),
  rirMax: z.number().int().min(0).max(5),
  restSeconds: z.number().int().min(30).max(300),
  notes: z.string().max(500).default(""),
});

const aiTrainingDaySchema = z.object({
  weekday: z.number().int().min(1).max(7),
  name: z.string().trim().min(2).max(120),
  exercises: z.array(aiExerciseSchema).min(1).max(12),
}).strict();

export const aiWorkoutPlanSchema = z.object({
  name: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(1000),
  warnings: z.array(z.string().trim().min(3).max(300)).max(6),
  days: z.array(aiTrainingDaySchema).min(1).max(7),
}).strict().superRefine((value, context) => {
  const weekdays = value.days.map((day) => day.weekday);
  if (new Set(weekdays).size !== weekdays.length) {
    context.addIssue({ code: "custom", message: "A IA repetiu um dia da semana.", path: ["days"] });
  }
  for (const [dayIndex, day] of value.days.entries()) {
    const names = day.exercises.map((exercise) => exercise.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"));
    if (new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", message: "A IA repetiu um exercício no mesmo treino.", path: ["days", dayIndex, "exercises"] });
    }
  }
});

export type AiWorkoutPlan = z.infer<typeof aiWorkoutPlanSchema>;
