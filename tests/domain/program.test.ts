import { describe, expect, it } from "vitest";
import {
  femaleProgram,
  femaleProgramV1,
  femaleProgramV2,
  femaleProgramV3,
  maleProgram,
  maleProgramV1,
  maleProgramV2,
} from "../../worker/data/programs";
import { calculateCurrentBlock, calculateCurrentWeek, validateProgramSeed } from "../../worker/domain/program";

describe("programação anual", () => {
  it("valida todas as versões e aponta os aliases para os novos PDFs", () => {
    for (const program of [femaleProgramV1, femaleProgramV2, femaleProgramV3, maleProgramV1, maleProgramV2]) {
      expect(validateProgramSeed(program)).toEqual({ valid: true, errors: [] });
    }
    expect(femaleProgram).toBe(femaleProgramV3);
    expect(maleProgram).toBe(maleProgramV2);
    expect(femaleProgram.sourceResearch).toBe("new_correct_train/Programa de Treino Glúteo Médio.pdf");
    expect(maleProgram.sourceResearch).toBe("new_correct_train/Programa Anual de Hipertrofia e Recomposição.pdf");
  });

  it("preserva exatamente a sessão feminina de superiores do novo PDF", () => {
    for (const block of femaleProgram.blocks) {
      const upper = block.days.find((day) => day.weekday === 2);
      expect(upper?.exercises).toHaveLength(6);
      expect(upper?.exercises.map((exercise) => exercise.category)).toEqual([
        "back", "back", "shoulders", "shoulders", "triceps", "biceps",
      ]);
      expect(upper?.exercises.map((exercise) => exercise.sets)).toEqual([3, 3, 3, 3, 3, 2]);
      expect(upper?.exercises.map((exercise) => exercise.name)).toEqual([
        "Puxada Alta Neutra",
        "Remada com Apoio no Peito",
        "Elevação Lateral com Halteres ou Cabo",
        "Crucifixo Invertido",
        "Tríceps Corda na Polia",
        "Rosca Alternada com Halteres",
      ]);
      expect(upper?.exercises.some((exercise) => exercise.category === "chest")).toBe(false);
    }
  });

  it("implementa a semana feminina V3 e o volume direto da síntese anual", () => {
    const expectedVolumes = [11, 13, 15, 12];
    for (const [index, block] of femaleProgramV3.blocks.entries()) {
      expect(block.days.map((item) => item.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(block.days.map((item) => item.name)).toEqual([
        "Lower A — Glúteo Médio + Glúteo Máximo",
        "Upper — Manutenção de Superiores",
        "Lower B — Quadríceps + Glúteo Médio",
        "Descanso total / recuperação ativa",
        "Lower C — Posteriores + Glúteo Máximo",
        "Especialização curta — Glúteo Médio + Panturrilha + Core",
        "Descanso total",
      ]);
      const direct = block.days.flatMap((item) => item.exercises).filter((item) => item.countsAsDirectGluteMedius);
      expect(direct.reduce((sum, item) => sum + item.sets, 0)).toBe(expectedVolumes[index]);
      expect(block.days.filter((item) => item.exercises.some((exercise) => exercise.countsAsDirectGluteMedius)).map((item) => item.weekday)).toEqual([1, 3, 6]);
      expect(block.cardio.map((item) => item.weekday)).toEqual([2, 4, 7]);
    }
  });

  it("mantém quinta-feira feminina sem musculação e unilaterais fora do contador direto", () => {
    for (const block of femaleProgramV3.blocks) {
      expect(block.days.find((item) => item.weekday === 4)?.type).toBe("recovery");
      const indirect = block.days.flatMap((item) => item.exercises)
        .filter((item) => ["bulgarian-split-squat", "prancha-lateral-abducao"].includes(item.slug));
      expect(indirect.every((item) => !item.countsAsDirectGluteMedius)).toBe(true);
    }
  });

  it("preserva a ficha feminina V2 como histórico sem mutá-la", () => {
    expect(femaleProgramV2.version).toBe("2026.2");
    expect(femaleProgramV2.blocks.map((block) => block.days.map((item) => item.weekday))).toEqual([
      [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7],
    ]);
    const volumes = femaleProgramV2.blocks.map((block) => block.days.flatMap((day) => day.exercises)
      .filter((exercise) => exercise.countsAsDirectGluteMedius).reduce((sum, exercise) => sum + exercise.sets, 0));
    expect(volumes).toEqual([8, 10, 11, 9]);
  });

  it("implementa a semana masculina V2 sem alterar a V1 histórica", () => {
    expect(maleProgram.version).toBe("2026.2");
    expect(maleProgram.blocks.map((block) => block.days.map((item) => item.weekday))).toEqual([
      [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7],
    ]);
    expect(maleProgram.blocks.every((block) => block.days.find((day) => day.weekday === 4)?.type === "recovery")).toBe(true);
    expect(maleProgram.blocks.every((block) => block.cardio.map((item) => item.weekday).join(",") === "4,7")).toBe(true);
    expect(maleProgram.blocks[0]?.days[0]?.name).toBe("Upper Body A — Peitoral + Dorsais");

    expect(maleProgramV1.version).toBe("2026.1");
    expect(maleProgramV1.blocks.map((block) => block.days.map((item) => item.weekday))).toEqual([
      [1, 2, 3, 5], [1, 2, 3, 5], [1, 2, 3, 5], [1, 2, 3, 5],
    ]);
    expect(maleProgramV1.blocks[0]?.days[0]?.name).toBe("Upper A + panturrilha");
  });

  it("transcreve equipamento e volume masculino das fichas detalhadas", () => {
    const firstMaleDay = maleProgramV2.blocks[0]!.days[0]!;
    expect(firstMaleDay.exercises.find((item) => item.slug === "supino-barra")?.equipment).toBe("Barra");
    expect(firstMaleDay.exercises.find((item) => item.slug === "elevacao-lateral-cabo")?.equipment).toBe("Cabo/polia");
    for (const block of maleProgramV2.blocks) {
      const exercises = block.days.flatMap((day) => day.exercises);
      expect(exercises.filter((exercise) => exercise.category === "calves").reduce((sum, exercise) => sum + exercise.sets, 0)).toBe(16);
      expect(exercises.filter((exercise) => exercise.category === "core").reduce((sum, exercise) => sum + exercise.sets, 0)).toBe(12);
    }
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
