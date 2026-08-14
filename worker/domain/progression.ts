export interface PerformedSet {
  loadKg: number;
  reps: number;
  actualRir: number;
  completed: boolean;
}

export interface ProgressionInput {
  sets: PerformedSet[];
  prescribedSets: number;
  repsMin: number;
  repsMax: number;
  rirMin: number;
  rirMax: number;
  techniqueConfirmed: boolean;
  repeatedPerformanceDrop: boolean;
  fatigueSignals: number;
  loadIncreasePercent: readonly [number, number] | null;
  useSmallestAvailableIncrement?: boolean;
}

export type ProgressionSuggestion =
  | { kind: "insufficient_data"; message: string }
  | { kind: "increase_load"; minPercent: number | null; maxPercent: number | null; message: string }
  | { kind: "hold_and_add_reps"; message: string }
  | { kind: "hold_and_review_recovery"; message: string };

export function calculateProgressionSuggestion(input: ProgressionInput): ProgressionSuggestion {
  const completed = input.sets.filter((set) => set.completed);
  if (completed.length !== input.prescribedSets) return { kind: "insufficient_data", message: "Conclua todas as séries para receber uma sugestão." };
  if (input.repeatedPerformanceDrop && input.fatigueSignals >= 2) {
    return { kind: "hold_and_review_recovery", message: "Não aumente a carga. Há queda repetida de performance e sinais de fadiga; revise a recuperação e o protocolo do programa." };
  }
  const atCeiling = completed.every((set) => set.reps >= input.repsMax);
  const rirCorrect = completed.every((set) => set.actualRir >= input.rirMin && set.actualRir <= input.rirMax);
  if (atCeiling && rirCorrect && input.techniqueConfirmed) {
    if (input.useSmallestAvailableIncrement || !input.loadIncreasePercent) {
      return {
        kind: "increase_load",
        minPercent: null,
        maxPercent: null,
        message: "Pronta para considerar aumento de carga.",
      };
    }
    return {
      kind: "increase_load",
      minPercent: input.loadIncreasePercent[0],
      maxPercent: input.loadIncreasePercent[1],
      message: "Pronta para considerar aumento de carga.",
    };
  }
  return { kind: "hold_and_add_reps", message: "Mantenha a carga e tente aumentar repetições." };
}

export function calculateWorkoutCompletion(exercises: Array<{ completedSets: number; prescribedSets: number }>): number {
  const prescribed = exercises.reduce((sum, item) => sum + item.prescribedSets, 0);
  if (prescribed === 0) return 0;
  const completed = exercises.reduce((sum, item) => sum + Math.min(item.completedSets, item.prescribedSets), 0);
  return Math.round((completed / prescribed) * 100);
}
