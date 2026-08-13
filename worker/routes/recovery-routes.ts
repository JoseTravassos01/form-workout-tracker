import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { evaluateRecoveryStatus } from "../domain/recovery";
import { HttpError } from "../lib/http-error";
import { RecoveryRepository } from "../repositories/recovery-repository";
import { TrainingService } from "../services/training-service";
import type { AppEnvironment } from "../types";
import { recoverySchema } from "../validation/api";

export const recoveryRoutes = new Hono<AppEnvironment>()
  .get("/latest", async (context) => context.json({ checkin: await new RecoveryRepository(context.env.DB).latest(context.get("athleteProfileId")) }))
  .post("/", zValidator("json", recoverySchema), async (context) => {
    const input = context.req.valid("json");
    const state = await new TrainingService(context.env.DB).effectiveState(context.get("athleteProfileId"));
    if (!state) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa não encontrado.");
    const answers = { ...input, performanceDropSessions: input.performanceDropSessions };
    const evaluation = evaluateRecoveryStatus(answers, context.get("profileSex"));
    return context.json(await new RecoveryRepository(context.env.DB).save(context.get("athleteProfileId"), state.currentWeek, answers, evaluation, input.notes), 201);
  });
