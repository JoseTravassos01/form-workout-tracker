import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { CardioRepository } from "../repositories/cardio-repository";
import type { AppEnvironment } from "../types";
import { cardioCompleteSchema, cardioStartSchema } from "../validation/api";

export const cardioRoutes = new Hono<AppEnvironment>()
  .post("/:prescriptionId/start", zValidator("json", cardioStartSchema), async (context) => {
    const input = context.req.valid("json");
    const result = await new CardioRepository(context.env.DB).start(context.get("athleteProfileId"), context.req.param("prescriptionId"), input.scheduledDate, input.version);
    if (!result.found) throw new HttpError(404, "CARDIO_NOT_FOUND", "Prescrição de cardio não encontrada.");
    if (result.conflict) throw new HttpError(409, "VERSION_CONFLICT", "Este cardio foi atualizado em outro dispositivo.");
    return context.json(result);
  })
  .post("/sessions/:sessionId/complete", zValidator("json", cardioCompleteSchema), async (context) => {
    const input = context.req.valid("json");
    const updated = await new CardioRepository(context.env.DB).complete(context.get("athleteProfileId"), context.req.param("sessionId"), input);
    if (!updated) throw new HttpError(409, "VERSION_CONFLICT", "Este cardio foi atualizado em outro dispositivo.");
    return context.json({ ok: true, version: input.version + 1 });
  });
