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
