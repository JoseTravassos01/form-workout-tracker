import { describe, expect, it } from "vitest";
import { calculateProgressionSuggestion, calculateWorkoutCompletion } from "../../worker/domain/progression";

const base = {
  prescribedSets: 3,
  repsMax: 12,
  rirMin: 1,
  rirMax: 2,
  techniqueConfirmed: true,
  repeatedPerformanceDrop: false,
  fatigueSignals: 0,
  loadIncreasePercent: [2, 5] as const,
};

describe("progressão por faixa de repetições", () => {
  it("sugere aumento somente no topo, com RIR e técnica adequados", () => {
    expect(calculateProgressionSuggestion({ ...base, sets: [
      { loadKg: 100, reps: 12, actualRir: 2, completed: true },
      { loadKg: 100, reps: 12, actualRir: 1, completed: true },
      { loadKg: 100, reps: 12, actualRir: 2, completed: true },
    ] }).kind).toBe("increase_load");
  });

  it("mantém a carga quando ainda há repetições a conquistar", () => {
    expect(calculateProgressionSuggestion({ ...base, sets: [
      { loadKg: 100, reps: 10, actualRir: 2, completed: true },
      { loadKg: 100, reps: 9, actualRir: 2, completed: true },
      { loadKg: 100, reps: 8, actualRir: 1, completed: true },
    ] }).kind).toBe("hold_and_add_reps");
  });

  it("não aumenta diante de queda repetida combinada a fadiga", () => {
    expect(calculateProgressionSuggestion({ ...base, repeatedPerformanceDrop: true, fatigueSignals: 3, sets: [
      { loadKg: 100, reps: 12, actualRir: 2, completed: true },
      { loadKg: 100, reps: 12, actualRir: 2, completed: true },
      { loadKg: 100, reps: 12, actualRir: 2, completed: true },
    ] }).kind).toBe("hold_and_review_recovery");
  });

  it("preserva a regra feminina de usar o menor incremento disponível em isoladores", () => {
    const result = calculateProgressionSuggestion({ ...base, loadIncreasePercent: null, useSmallestAvailableIncrement: true, sets: [
      { loadKg: 20, reps: 12, actualRir: 2, completed: true },
      { loadKg: 20, reps: 12, actualRir: 1, completed: true },
      { loadKg: 20, reps: 12, actualRir: 2, completed: true },
    ] });
    expect(result.kind).toBe("increase_load");
    expect(result.message).toContain("menor incremento disponível");
  });

  it("calcula conclusão por séries efetivas", () => {
    expect(calculateWorkoutCompletion([{ completedSets: 2, prescribedSets: 3 }, { completedSets: 1, prescribedSets: 1 }])).toBe(75);
  });
});
