import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { ProgramRepository } from "../repositories/program-repository";
import { CustomProgramRepository } from "../repositories/custom-program-repository";
import { AiWorkoutService } from "../services/ai-workout-service";
import { TrainingService } from "../services/training-service";
import type { AppEnvironment } from "../types";
import { aiWorkoutGenerationSchema, customProgramSchema, programStateSchema } from "../validation/api";

export const programRoutes = new Hono<AppEnvironment>()
  .get("/", async (context) => {
    const profileId = context.get("athleteProfileId");
    const repository = new ProgramRepository(context.env.DB);
    const service = new TrainingService(context.env.DB);
    const [state, blocks, focus] = await Promise.all([service.effectiveState(profileId), repository.getBlocks(profileId), service.focusSummary(profileId)]);
    if (!state) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa não encontrado.");
    return context.json({ program: { id: state.program_id, name: state.program_name, description: state.program_description, sourceResearch: state.source_research, version: state.program_version }, state: { currentWeek: state.currentWeek, currentBlock: state.currentBlock, manualOverride: state.manual_override === 1, version: state.state_version }, focus, blocks });
  })
  .get("/custom", async (context) => context.json({ programs: await new CustomProgramRepository(context.env.DB).list(context.get("athleteProfileId")) }))
  .post("/custom", zValidator("json", customProgramSchema), async (context) => {
    const result = await new CustomProgramRepository(context.env.DB).create(context.get("athleteProfileId"), context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200);
  })
  .get("/ai/status", async (context) => context.json(await new AiWorkoutService(context.env.DB, context.env).status(context.get("athleteProfileId"))))
  .post("/ai/generate", zValidator("json", aiWorkoutGenerationSchema), async (context) => {
    const result = await new AiWorkoutService(context.env.DB, context.env).generate(context.get("athleteProfileId"), context.req.valid("json"));
    return context.json(result, 201);
  })
  .delete("/custom/:periodId", async (context) => {
    const version = Number(context.req.query("version"));
    if (!Number.isInteger(version) || version < 1) throw new HttpError(422, "INVALID_VERSION", "Versão inválida.");
    const updated = await new CustomProgramRepository(context.env.DB).archive(context.get("athleteProfileId"), context.req.param("periodId"), version);
    if (!updated) throw new HttpError(409, "VERSION_CONFLICT", "Este ciclo foi alterado em outro dispositivo.");
    return context.json({ ok: true });
  })
  .get("/blocks/:id", async (context) => {
    const result = await new ProgramRepository(context.env.DB).getBlock(context.get("athleteProfileId"), context.req.param("id"));
    if (!result) throw new HttpError(404, "BLOCK_NOT_FOUND", "Bloco não encontrado.");
    return context.json(result);
  })
  .patch("/state", zValidator("json", programStateSchema), async (context) => {
    const input = context.req.valid("json");
    const updated = await new ProgramRepository(context.env.DB).updateState(context.get("athleteProfileId"), input.currentWeek, input.reason, input.version);
    if (!updated) throw new HttpError(409, "VERSION_CONFLICT", "A semana foi alterada em outro dispositivo. Atualize a página.");
    return context.json({ currentWeek: input.currentWeek, currentBlock: Math.ceil(input.currentWeek / 13) });
  });
