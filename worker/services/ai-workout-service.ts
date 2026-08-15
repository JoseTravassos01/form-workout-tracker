import { HttpError } from "../lib/http-error";
import { AiWorkoutRepository } from "../repositories/ai-workout-repository";
import type { AppBindings } from "../types";
import { AiWorkoutProviderError, requestWorkoutPlan } from "./deepseek-workout-client";

interface GenerationInput {
  prompt: string;
  durationWeeks: 4 | 12;
  startDate: string;
}

function dailyLimit(bindings: AppBindings): number {
  return Math.min(50, Math.max(1, Number(bindings.AI_DAILY_GENERATION_LIMIT) || 10));
}

function modelName(bindings: AppBindings): string {
  return String(bindings.DEEPSEEK_MODEL || "deepseek-v4-flash");
}

function sinceYesterday(now: Date): string {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

export class AiWorkoutService {
  private readonly repository: AiWorkoutRepository;

  constructor(database: D1Database, private readonly bindings: AppBindings) {
    this.repository = new AiWorkoutRepository(database);
  }

  async status(profileId: string) {
    const now = new Date();
    const limit = dailyLimit(this.bindings);
    const used = await this.repository.countSince(profileId, sinceYesterday(now));
    return {
      available: Boolean(this.bindings.DEEPSEEK_API_KEY),
      model: modelName(this.bindings),
      dailyLimit: limit,
      remainingToday: Math.max(0, limit - used),
    };
  }

  async generate(profileId: string, input: GenerationInput) {
    const apiKey = this.bindings.DEEPSEEK_API_KEY;
    if (!apiKey) throw new HttpError(503, "AI_NOT_CONFIGURED", "A geração por IA ainda não foi configurada neste ambiente.");

    const context = await this.repository.getPlanningContext(profileId);
    if (!context) throw new HttpError(404, "PROGRAM_NOT_FOUND", "Programa atual não encontrado.");

    const now = new Date();
    const generationId = crypto.randomUUID();
    const model = modelName(this.bindings);
    const reserved = await this.repository.reserveGeneration({
      id: generationId,
      profileId,
      model,
      durationWeeks: input.durationWeeks,
      promptLength: input.prompt.length,
      createdAt: now.toISOString(),
      since: sinceYesterday(now),
      limit: dailyLimit(this.bindings),
    });
    if (!reserved) throw new HttpError(429, "AI_DAILY_LIMIT", "O limite diário de rascunhos por IA foi atingido. Tente novamente mais tarde.");

    try {
      const generated = await requestWorkoutPlan({ apiKey, model, context, ...input });
      await this.repository.completeGeneration(generationId, profileId, generated.inputTokens, generated.outputTokens, new Date().toISOString());
      return {
        generationId,
        model,
        durationWeeks: input.durationWeeks,
        startDate: input.startDate,
        ...generated.plan,
        usage: { inputTokens: generated.inputTokens, outputTokens: generated.outputTokens },
      };
    } catch (error) {
      const code = error instanceof AiWorkoutProviderError ? error.code : "unexpected_error";
      await this.repository.failGeneration(generationId, profileId, code, new Date().toISOString());
      if (error instanceof AiWorkoutProviderError && error.code === "refused") {
        throw new HttpError(422, "AI_REQUEST_REFUSED", "A IA não conseguiu criar um rascunho seguro para esse pedido. Reformule as preferências.");
      }
      if (error instanceof AiWorkoutProviderError && error.code === "authentication") {
        throw new HttpError(503, "AI_AUTHENTICATION_ERROR", "A chave da DeepSeek foi recusada. Cadastre uma chave válida nos secrets deste ambiente.");
      }
      if (error instanceof AiWorkoutProviderError && error.code === "insufficient_balance") {
        throw new HttpError(503, "AI_INSUFFICIENT_BALANCE", "O saldo da DeepSeek é insuficiente. Adicione créditos e tente novamente.");
      }
      if (error instanceof AiWorkoutProviderError && error.code === "rate_limited") {
        throw new HttpError(502, "AI_RATE_LIMITED", "A DeepSeek está limitando as solicitações agora. Aguarde um instante e tente novamente.");
      }
      throw new HttpError(502, "AI_PROVIDER_ERROR", "A IA não conseguiu gerar o treino agora. Tente novamente em alguns instantes.");
    }
  }
}
