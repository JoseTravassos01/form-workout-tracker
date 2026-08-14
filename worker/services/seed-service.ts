import { femaleProgramV1, femaleProgramV2, femaleProgramV3, maleProgramV1, maleProgramV2 } from "../data/programs";
import { validateProgramSeed } from "../domain/program";
import { hashPassword } from "../lib/crypto";
import { SeedRepository } from "../repositories/seed-repository";
import type { AppBindings } from "../types";

function required(value: string | undefined, name: string): string {
  if (!value || value.length < 3) throw new Error(`Secret/configuração obrigatória ausente: ${name}`);
  return value;
}

function dateOrToday(value: string | undefined): string {
  const candidate = value ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) throw new Error("Data inicial deve usar YYYY-MM-DD.");
  return candidate;
}

export class SeedService {
  constructor(private readonly env: AppBindings) {}

  async run(): Promise<{ accounts: number; statements: number; programs: string[] }> {
    const validations = [femaleProgramV1, femaleProgramV2, femaleProgramV3, maleProgramV1, maleProgramV2].map(validateProgramSeed);
    const errors = validations.flatMap((item) => item.errors);
    if (errors.length > 0) throw new Error(`Seed científico inválido: ${errors.join(" | ")}`);

    const accounts = [
      {
        userId: "user:male:initial",
        profileId: "athlete:male:initial",
        username: required(this.env.MALE_USERNAME, "MALE_USERNAME").trim().toLocaleLowerCase("pt-BR"),
        passwordHash: await hashPassword(required(this.env.MALE_PASSWORD, "MALE_PASSWORD")),
        displayName: required(this.env.MALE_DISPLAY_NAME, "MALE_DISPLAY_NAME"),
        programStartDate: dateOrToday(this.env.MALE_PROGRAM_START_DATE),
        program: maleProgramV2,
        historicalPrograms: [maleProgramV1],
      },
      {
        userId: "user:female:initial",
        profileId: "athlete:female:initial",
        username: required(this.env.FEMALE_USERNAME, "FEMALE_USERNAME").trim().toLocaleLowerCase("pt-BR"),
        passwordHash: await hashPassword(required(this.env.FEMALE_PASSWORD, "FEMALE_PASSWORD")),
        displayName: required(this.env.FEMALE_DISPLAY_NAME, "FEMALE_DISPLAY_NAME"),
        programStartDate: dateOrToday(this.env.FEMALE_PROGRAM_START_DATE),
        program: femaleProgramV3,
        historicalPrograms: [femaleProgramV1, femaleProgramV2],
      },
    ];

    const repository = new SeedRepository(this.env.DB);
    const results = [];
    for (const account of accounts) results.push(await repository.seedAccount(account));
    return { accounts: accounts.length, statements: results.reduce((sum, item) => sum + item.statements, 0), programs: results.map((item) => item.programId) };
  }
}
