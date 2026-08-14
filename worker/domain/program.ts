import type { ProgramSeed } from "../data/programs";

export interface ProgramValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProgramSeed(program: ProgramSeed): ProgramValidationResult {
  const errors: string[] = [];
  if (program.blocks.length !== 4) errors.push("O programa precisa conter exatamente quatro blocos.");

  for (const block of program.blocks) {
    const weekdays = block.days.map((item) => item.weekday);
    const strengthWeekdays = block.days.filter((item) => item.type !== "recovery").map((item) => item.weekday);
    if (new Set(weekdays).size !== weekdays.length) errors.push(`Bloco ${block.number}: dias duplicados.`);
    if (program.key === "female-2026" && program.version === "2026.3") {
      if (strengthWeekdays.join(",") !== "1,2,3,5,6") errors.push(`Bloco ${block.number}: a V3 feminina deve treinar segunda, terça, quarta, sexta e sábado.`);
      const recoveryWeekdays = block.days.filter((item) => item.type === "recovery").map((item) => item.weekday);
      if (recoveryWeekdays.join(",") !== "4,7") errors.push(`Bloco ${block.number}: quinta e domingo devem ser recuperação.`);
      if (block.cardio.map((item) => item.weekday).join(",") !== "2,4,7") errors.push(`Bloco ${block.number}: o cardio feminino V3 deve ser distribuído entre terça, quinta e domingo.`);
    } else if (program.key === "female-2026" && program.version === "2026.2") {
      if (strengthWeekdays.join(",") !== "1,2,3,4,5") errors.push(`Bloco ${block.number}: a V2 feminina deve treinar de segunda a sexta.`);
      const recoveryWeekdays = block.days.filter((item) => item.type === "recovery").map((item) => item.weekday);
      if (recoveryWeekdays.join(",") !== "6,7") errors.push(`Bloco ${block.number}: sábado e domingo devem ser recuperação opcional.`);
      if (block.cardio.map((item) => item.weekday).join(",") !== "4") errors.push(`Bloco ${block.number}: Zone 2 deve ficar somente na quinta-feira.`);
    } else if (program.key === "male-2026" && program.version === "2026.2") {
      if (strengthWeekdays.join(",") !== "1,2,3,5,6,7") errors.push(`Bloco ${block.number}: o programa masculino V2 deve ter cinco sessões principais e a especialização de domingo.`);
      const recoveryWeekdays = block.days.filter((item) => item.type === "recovery").map((item) => item.weekday);
      if (recoveryWeekdays.join(",") !== "4") errors.push(`Bloco ${block.number}: quinta-feira deve ficar sem musculação.`);
      if (block.cardio.map((item) => item.weekday).join(",") !== "4,7") errors.push(`Bloco ${block.number}: cardio explícito deve aparecer quinta e domingo.`);
    } else {
      if (strengthWeekdays.join(",") !== "1,2,3,5") errors.push(`Bloco ${block.number}: a agenda deve ser segunda, terça, quarta e sexta.`);
      if (block.cardio.map((item) => item.weekday).join(",") !== "4,6,7") errors.push(`Bloco ${block.number}: cardio deve ocupar quinta, sábado e domingo.`);
    }

    for (const trainingDay of block.days) {
      for (const item of trainingDay.exercises) {
        if (item.sets < 1 || item.sets > 20) errors.push(`${block.number}/${trainingDay.name}/${item.name}: séries inválidas.`);
        if (item.reps[0] < 1 || item.reps[1] < item.reps[0]) errors.push(`${block.number}/${trainingDay.name}/${item.name}: repetições inválidas.`);
        if (item.rir[0] < 0 || item.rir[1] > 10 || item.rir[1] < item.rir[0]) errors.push(`${block.number}/${trainingDay.name}/${item.name}: RIR inválido.`);
        if (item.rest[0] < 1 || item.rest[1] < item.rest[0]) errors.push(`${block.number}/${trainingDay.name}/${item.name}: descanso inválido.`);
      }
    }
  }

  if (program.key === "female-2026") {
    program.blocks.forEach((block, index) => {
      const upper = block.days.find((item) => item.weekday === 2);
      if (!upper || upper.exercises.length !== 6) {
        errors.push(`Bloco feminino ${block.number}: superior deve ter exatamente seis exercícios.`);
      } else {
        const counts = upper.exercises.reduce<Record<string, number>>((acc, item) => {
          acc[item.category] = (acc[item.category] ?? 0) + 1;
          return acc;
        }, {});
        if (counts.back !== 2 || counts.shoulders !== 2 || counts.triceps !== 1 || counts.biceps !== 1 || counts.chest) {
          errors.push(`Bloco feminino ${block.number}: distribuição superior deve ser 2 costas, 2 ombros, 1 tríceps e 1 bíceps, sem peito.`);
        }
      }
      if (program.version === "2026.3") {
        const expectedDirectSets = [11, 13, 15, 12][index];
        const direct = block.days.flatMap((item) => item.exercises).filter((item) => item.countsAsDirectGluteMedius);
        const directDays = block.days.filter((item) => item.exercises.some((exercise) => exercise.countsAsDirectGluteMedius)).map((item) => item.weekday);
        if (direct.reduce((sum, item) => sum + item.sets, 0) !== expectedDirectSets) errors.push(`Bloco feminino V3 ${block.number}: volume direto de glúteo médio inválido.`);
        if (directDays.join(",") !== "1,3,6") errors.push(`Bloco feminino V3 ${block.number}: glúteo médio direto deve aparecer segunda, quarta e sábado.`);
        const thursday = block.days.find((item) => item.weekday === 4);
        if (!thursday || thursday.type !== "recovery" || thursday.exercises.length !== 0) errors.push(`Bloco feminino V3 ${block.number}: quinta-feira deve permanecer sem musculação.`);
      } else if (program.version === "2026.2") {
        const expectedDirectSets = [8, 10, 11, 9][index];
        const direct = block.days.flatMap((item) => item.exercises).filter((item) => item.countsAsDirectGluteMedius);
        const directDays = block.days.filter((item) => item.exercises.some((exercise) => exercise.countsAsDirectGluteMedius)).map((item) => item.weekday);
        if (direct.reduce((sum, item) => sum + item.sets, 0) !== expectedDirectSets) errors.push(`Bloco feminino V2 ${block.number}: volume direto de glúteo médio inválido.`);
        if (directDays.join(",") !== "1,3,5") errors.push(`Bloco feminino V2 ${block.number}: glúteo médio direto deve aparecer segunda, quarta e sexta.`);
        const thursday = block.days.find((item) => item.weekday === 4);
        const forbidden = ["agach", "leg-press", "hip-thrust", "romanian", "rdl"];
        if (!thursday || thursday.exercises.some((item) => forbidden.some((term) => item.slug.includes(term)) || item.countsAsDirectGluteMedius)) {
          errors.push(`Bloco feminino V2 ${block.number}: quinta-feira não pode ter pernas pesadas ou glúteo médio direto.`);
        }
      } else if (block.days.filter((item) => item.weekday !== 2).length !== 3) {
        errors.push(`Bloco feminino ${block.number}: deve haver três sessões de inferiores.`);
      }
    });
  }

  if (program.key === "male-2026" && program.version === "2026.1") {
    const expectedCalves = [11, 14, 15, 16];
    const expectedCore = [6, 10, 10, 10];
    program.blocks.forEach((block, index) => {
      const calves = block.days.flatMap((item) => item.exercises).filter((item) => item.category === "calves").reduce((sum, item) => sum + item.sets, 0);
      const core = block.days.flatMap((item) => item.exercises).filter((item) => item.category === "core").reduce((sum, item) => sum + item.sets, 0);
      if (calves !== expectedCalves[index]) errors.push(`Bloco masculino ${block.number}: panturrilhas ${calves}, esperado ${expectedCalves[index]}.`);
      if (core !== expectedCore[index]) errors.push(`Bloco masculino ${block.number}: abdômen ${core}, esperado ${expectedCore[index]}.`);
    });
  } else if (program.key === "male-2026") {
    program.blocks.forEach((block) => {
      const calves = block.days.flatMap((item) => item.exercises).filter((item) => item.category === "calves").reduce((sum, item) => sum + item.sets, 0);
      const core = block.days.flatMap((item) => item.exercises).filter((item) => item.category === "core").reduce((sum, item) => sum + item.sets, 0);
      if (calves !== 16) errors.push(`Bloco masculino V2 ${block.number}: panturrilhas ${calves}, esperado 16 nas fichas detalhadas.`);
      if (core !== 12) errors.push(`Bloco masculino V2 ${block.number}: abdômen ${core}, esperado 12 nas fichas detalhadas.`);
    });
  }

  return { valid: errors.length === 0, errors };
}

export function calculateCurrentWeek(programStartDate: string, todayDate: string): number {
  const start = Date.parse(`${programStartDate}T00:00:00Z`);
  const today = Date.parse(`${todayDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(today)) throw new Error("Data inválida.");
  const elapsedDays = Math.floor((today - start) / 86_400_000);
  return Math.min(52, Math.max(1, Math.floor(elapsedDays / 7) + 1));
}

export function calculateCurrentBlock(currentWeek: number): 1 | 2 | 3 | 4 {
  if (!Number.isInteger(currentWeek) || currentWeek < 1 || currentWeek > 52) throw new Error("Semana deve estar entre 1 e 52.");
  return Math.min(4, Math.ceil(currentWeek / 13)) as 1 | 2 | 3 | 4;
}

export function dateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
