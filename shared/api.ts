export interface ApiErrorPayload {
  error: { code: string; message: string; requestId?: string };
}

export type WorkoutStatus = "scheduled" | "in_progress" | "completed" | "missed" | "skipped" | "rescheduled" | "partial";

export type ProgressionSuggestionDto =
  | { kind: "insufficient_data"; message: string }
  | { kind: "increase_load"; minPercent: number | null; maxPercent: number | null; message: string }
  | { kind: "hold_and_add_reps"; message: string }
  | { kind: "hold_and_review_recovery"; message: string };

export interface WorkoutSetDto {
  id: string;
  setNumber: number;
  loadKg: number | null;
  reps: number | null;
  actualRir: number | null;
  notes: string;
  completed: boolean;
  version: number;
}

export interface PreviousExerciseSessionDto {
  sessionId: string;
  scheduledDate: string;
  techniqueConfirmed: boolean;
  sets: Array<Pick<WorkoutSetDto, "setNumber" | "loadKg" | "reps" | "actualRir" | "notes" | "completed">>;
}

export interface MeDto {
  user: { id: string; username: string };
  athlete: {
    id: string;
    name: string;
    sex: "male" | "female";
    timezone: string;
    themeKey: string;
    accentColor: string;
    programStartDate: string;
    currentWeightKg: number | null;
  };
}

export interface ExercisePrescriptionDto {
  prescriptionId: string;
  exerciseId: string;
  name: string;
  equipment: string | null;
  instructions: string;
  orderIndex: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  repsLabel: string | null;
  rirMin: number;
  rirMax: number;
  rirDirection: string | null;
  restSecondsMin: number;
  restSecondsMax: number;
  techniqueNotes: string;
  progressionNotes: string;
  primaryMuscle: string;
  secondaryMuscles: string;
  category: string;
  requiresSelection: boolean;
  log: null | {
    id: string;
    completed: boolean;
    techniqueConfirmed: boolean;
    notes: string;
    version: number;
    sets: WorkoutSetDto[];
  };
  previousSession: PreviousExerciseSessionDto | null;
  previousSets: PreviousExerciseSessionDto["sets"];
  progressionSuggestion: ProgressionSuggestionDto | null;
}

export interface WorkoutDto {
  id: string;
  scheduledDate: string;
  blockNumber: number;
  name: string;
  description: string;
  status: WorkoutStatus;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string;
  version: number;
  durationMin: number | null;
  durationMax: number | null;
  completionPercent: number;
  guidance: string | null;
  exercises: ExercisePrescriptionDto[];
}

export interface ExerciseHistoryEntryDto {
  sessionId: string;
  scheduledDate: string;
  status: WorkoutStatus;
  setNumber: number;
  loadKg: number;
  reps: number;
  actualRir: number;
  notes: string;
  volumeKg: number;
}

export interface ExerciseHistorySessionDto {
  sessionId: string;
  scheduledDate: string;
  status: WorkoutStatus;
  maxLoadKg: number;
  bestReps: number;
  volumeKg: number;
  sets: ExerciseHistoryEntryDto[];
}

export interface ExerciseHistoryDto {
  exercise: { id: string; name: string; muscleGroup: string; equipment: string | null };
  history: ExerciseHistoryEntryDto[];
  sessions: ExerciseHistorySessionDto[];
  bestLoad: number;
  bestReps: number;
  volume: number;
  sessionCount: number;
}

export interface StrengthProgressDto extends ExerciseHistoryDto {
  exercises: Array<{ id: string; name: string }>;
  selectedExerciseId: string;
}
