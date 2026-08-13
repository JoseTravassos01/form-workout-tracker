import { Hono } from "hono";
import { ProgramRepository } from "../repositories/program-repository";
import type { AppEnvironment } from "../types";

export const scienceRoutes = new Hono<AppEnvironment>()
  .get("/", async (context) => context.json(await new ProgramRepository(context.env.DB).getScience(context.get("athleteProfileId"))));
