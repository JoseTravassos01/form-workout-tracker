import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { MeasurementRepository } from "../repositories/measurement-repository";
import { TrainingService } from "../services/training-service";
import type { AppEnvironment } from "../types";
import { measurementSchema } from "../validation/api";

export const measurementRoutes = new Hono<AppEnvironment>()
  .get("/", async (context) => context.json({ measurements: await new MeasurementRepository(context.env.DB).list(context.get("athleteProfileId")) }))
  .post("/", zValidator("json", measurementSchema), async (context) => {
    const result = await new MeasurementRepository(context.env.DB).create(context.get("athleteProfileId"), context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200);
  });

export const progressRoutes = new Hono<AppEnvironment>()
  .get("/weight", async (context) => context.json(await new MeasurementRepository(context.env.DB).weightProgress(context.get("athleteProfileId"))))
  .get("/strength", async (context) => context.json(await new TrainingService(context.env.DB).strength(context.get("athleteProfileId"), context.req.query("exerciseId"))));
