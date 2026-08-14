import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { WorkoutRepository } from "../repositories/workout-repository";
import { TrainingService } from "../services/training-service";
import type { AppEnvironment } from "../types";
import { completeExerciseSchema, customizeExerciseSchema, prepareWorkoutSchema, sessionMutationSchema, setLogSchema } from "../validation/api";

export const workoutRoutes = new Hono<AppEnvironment>()
  .get("/today", async (context) => {
    const result = await new TrainingService(context.env.DB).today(context.get("athleteProfileId"));
    if (!result) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa não encontrado.");
    return context.json(result);
  })
  .post("/prepare", zValidator("json", prepareWorkoutSchema), async (context) => {
    const input = context.req.valid("json");
    const id = await new WorkoutRepository(context.env.DB).ensureCalendarSession(
      context.get("athleteProfileId"),
      input.trainingDayId,
      input.scheduledDate,
      input.originalDate,
    );
    if (!id) throw new HttpError(404, "WORKOUT_NOT_FOUND", "Treino não encontrado para este dia.");
    return context.json({ id }, 201);
  })
  .get("/:id", async (context) => {
    const workout = await new TrainingService(context.env.DB).workout(context.get("athleteProfileId"), context.req.param("id"));
    if (!workout) throw new HttpError(404, "WORKOUT_NOT_FOUND", "Treino não encontrado.");
    return context.json(workout);
  })
  .post("/:id/start", zValidator("json", sessionMutationSchema), async (context) => {
    const input = context.req.valid("json");
    const updated = await new WorkoutRepository(context.env.DB).updateSession(context.get("athleteProfileId"), context.req.param("id"), input.version, "in_progress", input.notes);
    if (!updated) throw new HttpError(409, "VERSION_CONFLICT", "Este treino foi atualizado em outro dispositivo.");
    return context.json({ ok: true, version: input.version + 1 });
  })
  .post("/:id/complete", zValidator("json", sessionMutationSchema), async (context) => {
    const input = context.req.valid("json");
    const workout = await new TrainingService(context.env.DB).workout(context.get("athleteProfileId"), context.req.param("id"));
    if (!workout) throw new HttpError(404, "WORKOUT_NOT_FOUND", "Treino não encontrado.");
    const status = workout.completionPercent === 100 ? "completed" : "partial";
    const result = await new WorkoutRepository(context.env.DB).finishSession(context.get("athleteProfileId"), context.req.param("id"), input.version, status, input.notes);
    if (!result.updated) throw new HttpError(409, "VERSION_CONFLICT", "Este treino foi atualizado em outro dispositivo.");
    return context.json({ ok: true, version: input.version + 1, status: result.status });
  })
  .post("/:id/exercises/:prescriptionId/sets", zValidator("json", setLogSchema), async (context) => {
    const result = await new WorkoutRepository(context.env.DB).saveSet(context.get("athleteProfileId"), context.req.param("id"), context.req.param("prescriptionId"), context.req.valid("json"));
    if (result.conflict) throw new HttpError(409, "VERSION_CONFLICT", "Esta série foi atualizada em outro dispositivo. Seus dados locais foram mantidos para revisão.");
    return context.json({ ok: true, version: result.version });
  })
  .get("/:id/exercises/:prescriptionId/alternatives", async (context) => {
    const result = await new WorkoutRepository(context.env.DB).getExerciseAlternatives(context.get("athleteProfileId"), context.req.param("id"), context.req.param("prescriptionId"));
    if (!result) throw new HttpError(404, "EXERCISE_NOT_FOUND", "Exercício não encontrado neste treino.");
    return context.json(result);
  })
  .patch("/:id/exercises/:prescriptionId/customization", zValidator("json", customizeExerciseSchema), async (context) => {
    const result = await new WorkoutRepository(context.env.DB).customizeExercise(context.get("athleteProfileId"), context.req.param("id"), context.req.param("prescriptionId"), context.req.valid("json"));
    if (!result.ok) {
      if (result.reason === "not_found") throw new HttpError(404, "EXERCISE_NOT_FOUND", "Exercício não encontrado neste treino.");
      if (result.reason === "invalid_replacement") throw new HttpError(422, "INVALID_REPLACEMENT", "Escolha um exercício semelhante disponível para este treino.");
      if (result.reason === "set_count_too_low") throw new HttpError(422, "INVALID_SET_COUNT", "A quantidade de séries não pode ser menor que as séries já registradas.");
      if (result.reason === "locked") throw new HttpError(409, "EXERCISE_LOCKED", "Não é possível trocar o exercício depois de registrar uma série ou finalizar o treino.");
      throw new HttpError(409, "VERSION_CONFLICT", "Esta personalização foi atualizada em outro dispositivo.");
    }
    return context.json({ ok: true, version: result.version });
  })
  .patch("/:id/exercises/:prescriptionId", zValidator("json", completeExerciseSchema), async (context) => {
    const updated = await new WorkoutRepository(context.env.DB).updateExercise(context.get("athleteProfileId"), context.req.param("id"), context.req.param("prescriptionId"), context.req.valid("json"));
    if (!updated) throw new HttpError(409, "VERSION_CONFLICT", "Este exercício foi atualizado em outro dispositivo.");
    return context.json({ ok: true });
  })
  .get("/:id/exercises/:prescriptionId/suggestion", async (context) => {
    const workout = await new TrainingService(context.env.DB).workout(context.get("athleteProfileId"), context.req.param("id"));
    const item = workout?.exercises.find((exercise) => exercise.prescriptionId === context.req.param("prescriptionId"));
    if (!item) throw new HttpError(404, "EXERCISE_NOT_FOUND", "Exercício não encontrado.");
    return context.json(item.progressionSuggestion ?? { kind: "insufficient_data", message: "Ainda não há uma execução completa para sugerir progressão." });
  });

export const exerciseRoutes = new Hono<AppEnvironment>()
  .get("/:id/history", async (context) => {
    const history = await new WorkoutRepository(context.env.DB).getExerciseHistory(context.get("athleteProfileId"), context.req.param("id"));
    if (!history) throw new HttpError(404, "EXERCISE_NOT_FOUND", "Exercício não encontrado neste programa.");
    return context.json(history);
  });
