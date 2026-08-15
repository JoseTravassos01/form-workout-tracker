import { describe, expect, it } from "vitest";
import type { AiPlanningContext } from "../../worker/repositories/ai-workout-repository";
import { AiWorkoutProviderError, requestWorkoutPlan } from "../../worker/services/openai-workout-client";

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
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }],
    usage: { input_tokens: 1200, output_tokens: 450 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("rascunho de treino por IA", () => {
  it("usa Structured Output sem armazenamento e normaliza exercício canônico", async () => {
    const captured: { body?: Record<string, unknown> } = {};
    const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
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

    const result = await requestWorkoutPlan({ apiKey: "test-api-key", model: "gpt-test", prompt: "Quero treinar pernas três vezes na semana.", durationWeeks: 4, startDate: "2026-08-17", context: planningContext, fetcher });

    expect(result.plan.days[0]?.exercises[0]?.name).toBe("Hip Thrust");
    expect(result).toMatchObject({ inputTokens: 1200, outputTokens: 450 });
    expect(captured.body?.store).toBe(false);
    expect(captured.body?.model).toBe("gpt-test");
    expect(captured.body?.text).toMatchObject({ format: { type: "json_schema", strict: true } });
    expect(String(captured.body?.input)).not.toContain("athlete:female:initial");
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

    await expect(requestWorkoutPlan({ apiKey: "test-api-key", model: "gpt-test", prompt: "Quero um treino completo para quatro semanas.", durationWeeks: 4, startDate: "2026-08-17", context: planningContext, fetcher }))
      .rejects.toMatchObject({ code: "invalid_plan" } satisfies Partial<AiWorkoutProviderError>);
  });
});
