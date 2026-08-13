import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { TrainingService } from "../services/training-service";
import type { AppEnvironment } from "../types";

export const dashboardRoutes = new Hono<AppEnvironment>()
  .get("/", async (context) => {
    const result = await new TrainingService(context.env.DB).dashboard(context.get("athleteProfileId"));
    if (!result) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa não encontrado.");
    return context.json(result);
  });
