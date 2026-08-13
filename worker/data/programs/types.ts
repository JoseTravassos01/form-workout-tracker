export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ExerciseSeed {
  slug: string;
  name: string;
  equipment?: string;
  sets: number;
  reps: readonly [number, number];
  repsLabel?: string;
  rir: readonly [number, number];
  rirDirection?: "down";
  rest: readonly [number, number];
  primaryMuscle: string;
  secondaryMuscles?: string;
  category: string;
  techniqueNotes: string;
  progressionNotes?: string;
  requiresSelection?: boolean;
}

function inferEquipment(slug: string, name: string): string | undefined {
  const exerciseName = `${slug} ${name}`.toLocaleLowerCase("pt-BR");
  if (exerciseName.includes("smith")) return "Máquina Smith";
  if (exerciseName.includes("halter")) return "Halteres";
  if (exerciseName.includes("máquina ou barra") || exerciseName.includes("barra/máquina")) return "Máquina ou barra";
  if (exerciseName.includes("cabo/máquina")) return "Cabo ou máquina";
  if (exerciseName.includes("máquina/cabo")) return "Máquina ou cabo";
  if (exerciseName.includes("barra/puxada") || exerciseName.includes("barra-ou-puxada")) return "Barra fixa ou puxador";
  if (exerciseName.includes("cabo") || exerciseName.includes("cable") || exerciseName.includes("polia") || exerciseName.includes("crossover")) return "Cabo/polia";
  if (exerciseName.includes("ab wheel")) return "Roda abdominal";
  if (exerciseName.includes("hack") || exerciseName.includes("leg press") || exerciseName.includes("máquina") || exerciseName.includes("maquina") || exerciseName.includes("extensora") || exerciseName.includes("flexora") || exerciseName.includes("adutora") || exerciseName.includes("abdução") || exerciseName.includes("abducao") || exerciseName.includes("pec deck")) return "Máquina";
  if (exerciseName.includes("barra")) return "Barra";
  return undefined;
}

export interface TrainingDaySeed {
  weekday: Weekday;
  name: string;
  description: string;
  duration?: readonly [number, number];
  exercises: ExerciseSeed[];
}

export interface CardioSeed {
  weekday: Weekday;
  modality: string;
  duration: readonly [number, number];
  intensity: string;
  rpe: readonly [number, number];
  instructions: string;
  recoveryNotes: string;
  optionalIntervalProtocol?: string;
}

export interface BlockSeed {
  number: 1 | 2 | 3 | 4;
  name: string;
  weeks: readonly [number, number];
  objective: string;
  description: string;
  differences: string;
  volumeSummary: string;
  days: TrainingDaySeed[];
  cardio: CardioSeed[];
}

export interface ScienceTopicSeed {
  category: string;
  title: string;
  summary: string;
}

export interface ScienceReferenceSeed {
  topicCategory: string;
  title: string;
  pmid?: string;
  doi?: string;
  url: string;
}

export interface ProgramSeed {
  key: "male-2026" | "female-2026";
  name: string;
  description: string;
  sourceResearch: string;
  version: "2026.1";
  profile: {
    sex: "male" | "female";
    heightCm?: number;
    currentWeightGrams?: number;
    themeKey: string;
    accentColor: string;
  };
  readaptation: string;
  progressionPolicy: Record<string, unknown>;
  recoveryPolicy: Record<string, unknown>;
  blocks: BlockSeed[];
  scienceTopics: ScienceTopicSeed[];
  references: ScienceReferenceSeed[];
}

export function exercise(
  slug: string,
  name: string,
  sets: number,
  reps: readonly [number, number],
  rir: readonly [number, number],
  rest: readonly [number, number],
  primaryMuscle: string,
  category: string,
  techniqueNotes: string,
  options: Partial<Omit<ExerciseSeed, "slug" | "name" | "sets" | "reps" | "rir" | "rest" | "primaryMuscle" | "category" | "techniqueNotes">> = {},
): ExerciseSeed {
  const equipment = options.equipment ?? inferEquipment(slug, name);
  return { slug, name, sets, reps, rir, rest, primaryMuscle, category, techniqueNotes, ...(equipment ? { equipment } : {}), ...options };
}

export function day(
  weekday: Weekday,
  name: string,
  exercises: ExerciseSeed[],
  description = "",
  duration?: readonly [number, number],
): TrainingDaySeed {
  return { weekday, name, exercises, description, ...(duration ? { duration } : {}) };
}

export function cardio(
  weekday: Weekday,
  modality: string,
  duration: readonly [number, number],
  rpe: readonly [number, number],
  intensity: string,
  instructions: string,
  recoveryNotes: string,
  optionalIntervalProtocol?: string,
): CardioSeed {
  return { weekday, modality, duration, rpe, intensity, instructions, recoveryNotes, ...(optionalIntervalProtocol ? { optionalIntervalProtocol } : {}) };
}
