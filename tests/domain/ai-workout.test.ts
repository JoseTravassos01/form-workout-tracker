import { describe, expect, it } from "vitest";
import type { AiPlanningContext } from "../../worker/repositories/ai-workout-repository";
import { AiWorkoutProviderError, requestWorkoutPlan } from "../../worker/services/deepseek-workout-client";

const planningContext: AiPlanningContext = {
  sex: "female",
  programName: "Programa atual",
  programDescription: "Hipertrofia com prioridade em membros inferiores.",
  programVersion: "2026.3",
  currentWeek: 5,
  currentBlock: 1,
  prescriptions: [{
    weekday: 1,
    dayName: "Lower A",
    exerciseId: "exercise:hip-thrust",
    exerciseName: "Hip Thrust",
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    rirMin: 1,
    rirMax: 2,
    restSecondsMin: 150,
    restSecondsMax: 180,
  }],
  recentPerformance: [{ exerciseName: "Hip Thrust", lastDate: "2026-08-10", maxLoadKg: 80, bestReps: 12, averageRir: 1.5 }],
  canonicalExercises: [{ id: "exercise:hip-thrust", name: "Hip Thrust" }],
};

function providerResponse(output: unknown) {
  return new Response(JSON.stringify({
    choices: [{ finish_reason: "stop", index: 0, message: { role: "assistant", content: JSON.stringify(output) } }],
    usage: { prompt_tokens: 1200, completion_tokens: 450, total_tokens: 1650 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("rascunho de treino por IA", () => {
  it("usa o JSON Output da DeepSeek e normaliza exercício canônico", async () => {
    const captured: { url?: string; body?: Record<string, unknown> } = {};
    const fetcher = (async (request: RequestInfo | URL, init?: RequestInit) => {
      captured.url = String(request);
      captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return providerResponse({
        name: "Ciclo de força e hipertrofia",
        summary: "Quatro semanas com progressão conservadora e técnica consistente.",
        warnings: [],
        days: [{
          weekday: 1,
          name: "Lower A",
          exercises: [{ name: "hip thrust", sets: 3, repsMin: 8, repsMax: 12, rirMin: 1, rirMax: 2, restSeconds: 180, notes: "Amplitude completa." }],
        }],
      });
    }) as typeof fetch;

    const result = await requestWorkoutPlan({ apiKey: "test-api-key", model: "deepseek-test", prompt: "Quero treinar pernas três vezes na semana.", durationWeeks: 4, startDate: "2026-08-17", context: planningContext, fetcher });

    expect(result.plan.days[0]?.exercises[0]?.name).toBe("Hip Thrust");
    expect(result).toMatchObject({ inputTokens: 1200, outputTokens: 450 });
    expect(captured.url).toBe("https://api.deepseek.com/chat/completions");
    expect(captured.body?.model).toBe("deepseek-test");
    expect(captured.body?.thinking).toEqual({ type: "disabled" });
    expect(captured.body?.response_format).toEqual({ type: "json_object" });
    expect(captured.body).not.toHaveProperty("store");
    const messages = captured.body?.messages as Array<{ role: string; content: string }>;
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[0]?.content).toContain("additionalProperties");
    expect(messages[1]).toMatchObject({ role: "user" });
    expect(messages[1]?.content).not.toContain("athlete:female:initial");
  });

  it("rejeita uma prescrição semanticamente inválida mesmo quando o JSON é válido", async () => {
    const fetcher = (async () => providerResponse({
      name: "Ciclo inválido",
      summary: "Este texto tem tamanho suficiente para passar pela validação básica.",
      warnings: [],
      days: [{
        weekday: 1,
        name: "Lower",
        exercises: [{ name: "Hip Thrust", sets: 3, repsMin: 15, repsMax: 8, rirMin: 1, rirMax: 2, restSeconds: 180, notes: "" }],
      }],
    })) as typeof fetch;

    await expect(requestWorkoutPlan({ apiKey: "test-api-key", model: "deepseek-test", prompt: "Quero um treino completo para quatro semanas.", durationWeeks: 4, startDate: "2026-08-17", context: planningContext, fetcher }))
      .rejects.toMatchObject({ code: "invalid_plan" } satisfies Partial<AiWorkoutProviderError>);
  });

  it("identifica saldo insuficiente sem ler ou registrar o corpo da resposta", async () => {
    const fetcher = (async () => new Response(null, { status: 402 })) as typeof fetch;
    await expect(requestWorkoutPlan({ apiKey: "test-api-key", model: "deepseek-test", prompt: "Quero um treino completo para quatro semanas.", durationWeeks: 4, startDate: "2026-08-17", context: planningContext, fetcher }))
      .rejects.toMatchObject({ code: "insufficient_balance" } satisfies Partial<AiWorkoutProviderError>);
  });
});
