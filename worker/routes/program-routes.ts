import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { ProgramRepository } from "../repositories/program-repository";
import { TrainingService } from "../services/training-service";
import type { AppEnvironment } from "../types";
import { programStateSchema } from "../validation/api";

export const programRoutes = new Hono<AppEnvironment>()
  .get("/", async (context) => {
    const profileId = context.get("athleteProfileId");
    const repository = new ProgramRepository(context.env.DB);
    const service = new TrainingService(context.env.DB);
    const [state, blocks, focus] = await Promise.all([service.effectiveState(profileId), repository.getBlocks(profileId), service.focusSummary(profileId)]);
    if (!state) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa não encontrado.");
    return context.json({ program: { id: state.program_id, name: state.program_name, description: state.program_description, sourceResearch: state.source_research, version: state.program_version }, state: { currentWeek: state.currentWeek, currentBlock: state.currentBlock, manualOverride: state.manual_override === 1, version: state.state_version }, focus, blocks });
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
