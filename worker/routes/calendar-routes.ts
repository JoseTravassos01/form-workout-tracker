import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { ActivityRepository } from "../repositories/activity-repository";
import { CalendarRepository } from "../repositories/calendar-repository";
import { CalendarService } from "../services/calendar-service";
import type { AppEnvironment } from "../types";
import { calendarOverrideSchema, calendarQuerySchema, extraActivitySchema } from "../validation/api";

export const calendarRoutes = new Hono<AppEnvironment>()
  .get("/", zValidator("query", calendarQuerySchema), async (context) => {
    const query = context.req.valid("query");
    const result = await new CalendarService(context.env.DB).list(context.get("athleteProfileId"), query.from, query.to);
    if (!result) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa não encontrado.");
    return context.json(result);
  })
  .post("/overrides", zValidator("json", calendarOverrideSchema), async (context) => {
    const result = await new CalendarRepository(context.env.DB).saveOverride(context.get("athleteProfileId"), context.req.valid("json"));
    if (result.conflict) throw new HttpError(409, "VERSION_CONFLICT", "Este dia foi alterado em outro dispositivo.");
    return context.json(result);
  })
  .post("/activities", zValidator("json", extraActivitySchema), async (context) => {
    const result = await new ActivityRepository(context.env.DB).create(context.get("athleteProfileId"), context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200);
  });
