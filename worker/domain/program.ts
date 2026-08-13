import type { ProgramSeed } from "../data/programs";

export interface ProgramValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProgramSeed(program: ProgramSeed): ProgramValidationResult {
  const errors: string[] = [];
  if (program.blocks.length !== 4) errors.push("O programa precisa conter exatamente quatro blocos.");

  for (const block of program.blocks) {
    const strengthWeekdays = block.days.map((item) => item.weekday);
    if (new Set(strengthWeekdays).size !== strengthWeekdays.length) errors.push(`Bloco ${block.number}: dias de força duplicados.`);
    if (strengthWeekdays.join(",") !== "1,2,3,5") errors.push(`Bloco ${block.number}: a agenda deve ser segunda, terça, quarta e sexta.`);
    if (block.cardio.map((item) => item.weekday).join(",") !== "4,6,7") errors.push(`Bloco ${block.number}: cardio deve ocupar quinta, sábado e domingo.`);

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
    for (const block of program.blocks) {
      const upper = block.days.find((item) => item.weekday === 2);
      if (!upper || upper.exercises.length !== 6) {
        errors.push(`Bloco feminino ${block.number}: superior deve ter exatamente seis exercícios.`);
        continue;
      }
      const counts = upper.exercises.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {});
      if (counts.back !== 2 || counts.shoulders !== 2 || counts.triceps !== 1 || counts.biceps !== 1 || counts.chest) {
        errors.push(`Bloco feminino ${block.number}: distribuição superior deve ser 2 costas, 2 ombros, 1 tríceps e 1 bíceps, sem peito.`);
      }
      if (block.days.filter((item) => item.weekday !== 2).length !== 3) errors.push(`Bloco feminino ${block.number}: deve haver três sessões de inferiores.`);
    }
  }

  if (program.key === "male-2026") {
    const expectedCalves = [11, 14, 15, 16];
    const expectedCore = [6, 10, 10, 10];
    program.blocks.forEach((block, index) => {
      const calves = block.days.flatMap((item) => item.exercises).filter((item) => item.category === "calves").reduce((sum, item) => sum + item.sets, 0);
      const core = block.days.flatMap((item) => item.exercises).filter((item) => item.category === "core").reduce((sum, item) => sum + item.sets, 0);
      if (calves !== expectedCalves[index]) errors.push(`Bloco masculino ${block.number}: panturrilhas ${calves}, esperado ${expectedCalves[index]}.`);
      if (core !== expectedCore[index]) errors.push(`Bloco masculino ${block.number}: abdômen ${core}, esperado ${expectedCore[index]}.`);
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
