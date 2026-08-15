import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { HttpError } from "../lib/http-error";
import { HydrationRepository } from "../repositories/hydration-repository";
import type { AppEnvironment } from "../types";
import { hydrationLogSchema, hydrationSettingsSchema, isoDateSchema } from "../validation/api";

const hydrationQuerySchema = z.object({ date: isoDateSchema });

export const hydrationRoutes = new Hono<AppEnvironment>()
  .get("/", zValidator("query", hydrationQuerySchema), async (context) => {
    return context.json(await new HydrationRepository(context.env.DB).summary(context.get("athleteProfileId"), context.req.valid("query").date));
  })
  .post("/logs", zValidator("json", hydrationLogSchema), async (context) => {
    const result = await new HydrationRepository(context.env.DB).add(context.get("athleteProfileId"), context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200);
  })
  .patch("/settings", zValidator("json", hydrationSettingsSchema), async (context) => {
    const result = await new HydrationRepository(context.env.DB).updateSettings(context.get("athleteProfileId"), context.req.valid("json"));
    if (result.conflict) throw new HttpError(409, "VERSION_CONFLICT", "As configurações de hidratação foram alteradas em outro dispositivo.");
    return context.json(result);
  });
