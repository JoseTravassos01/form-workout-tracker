import { describe, expect, it } from "vitest";
import { femaleProgram, maleProgram } from "../../worker/data/programs";
import { calculateCurrentBlock, calculateCurrentWeek, validateProgramSeed } from "../../worker/domain/program";

describe("programação anual", () => {
  it("mantém os dois seeds compatíveis com as invariantes extraídas", () => {
    expect(validateProgramSeed(maleProgram)).toEqual({ valid: true, errors: [] });
    expect(validateProgramSeed(femaleProgram)).toEqual({ valid: true, errors: [] });
  });

  it("preserva exatamente a sessão feminina de superiores", () => {
    for (const block of femaleProgram.blocks) {
      const upper = block.days.find((day) => day.weekday === 2);
      expect(upper?.exercises).toHaveLength(6);
      expect(upper?.exercises.map((exercise) => exercise.category)).toEqual([
        "back", "back", "shoulders", "shoulders", "triceps", "biceps",
      ]);
    }
  });

  it("mantém equipamento derivado somente quando a própria ficha o identifica", () => {
    const firstMaleDay = maleProgram.blocks[0]!.days[0]!;
    expect(firstMaleDay.exercises.find((item) => item.slug === "supino-maquina-ou-barra")?.equipment).toBe("Máquina ou barra");
    expect(firstMaleDay.exercises.find((item) => item.slug === "elevacao-lateral-cabo")?.equipment).toBe("Cabo/polia");
  });

  it("calcula e limita a semana atual", () => {
    expect(calculateCurrentWeek("2026-01-05", "2026-01-05")).toBe(1);
    expect(calculateCurrentWeek("2026-01-05", "2026-04-06")).toBe(14);
    expect(calculateCurrentWeek("2026-01-05", "2027-12-31")).toBe(52);
    expect(calculateCurrentWeek("2026-01-05", "2025-12-01")).toBe(1);
  });

  it("mapeia as 52 semanas em quatro blocos de 13 semanas", () => {
    expect([1, 13, 14, 26, 27, 39, 40, 52].map(calculateCurrentBlock)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(() => calculateCurrentBlock(53)).toThrow();
  });
});
