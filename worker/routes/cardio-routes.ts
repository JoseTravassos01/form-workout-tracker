import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { CardioRepository } from "../repositories/cardio-repository";
import { PersonalCardioRepository } from "../repositories/personal-cardio-repository";
import type { AppEnvironment } from "../types";
import { cardioCompleteSchema, cardioStartSchema, personalCardioPlanSchema } from "../validation/api";

export const cardioRoutes = new Hono<AppEnvironment>()
  .post("/plans", zValidator("json", personalCardioPlanSchema), async (context) => {
    const input = context.req.valid("json");
    const start = new Date(`${input.startDate}T12:00:00Z`);
    const end = new Date(`${input.endDate}T12:00:00Z`);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if ((input.recurrenceScope === "once" && days !== 0) || (input.recurrenceScope === "week" && days > 6) || (input.recurrenceScope === "month" && days > 31)) {
      throw new HttpError(422, "INVALID_RECURRENCE", "O período não corresponde à repetição escolhida.");
    }
    const result = await new PersonalCardioRepository(context.env.DB).create(context.get("athleteProfileId"), input);
    return context.json(result, result.created ? 201 : 200);
  })
  .delete("/plans/:id", async (context) => {
    const version = Number(context.req.query("version"));
    if (!Number.isInteger(version) || version < 1) throw new HttpError(422, "INVALID_VERSION", "Versão inválida.");
    const updated = await new PersonalCardioRepository(context.env.DB).archive(context.get("athleteProfileId"), context.req.param("id"), version);
    if (!updated) throw new HttpError(409, "VERSION_CONFLICT", "Este cardio foi alterado em outro dispositivo.");
    return context.json({ ok: true });
  })
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
