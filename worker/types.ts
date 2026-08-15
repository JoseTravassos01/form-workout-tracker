export type SecretBindings = {
  OPENAI_API_KEY?: string;
  SEED_SECRET?: string;
  MALE_USERNAME?: string;
  MALE_PASSWORD?: string;
  MALE_DISPLAY_NAME?: string;
  MALE_PROGRAM_START_DATE?: string;
  FEMALE_USERNAME?: string;
  FEMALE_PASSWORD?: string;
  FEMALE_DISPLAY_NAME?: string;
  FEMALE_PROGRAM_START_DATE?: string;
};

export type AiBindings = {
  OPENAI_MODEL?: string;
  AI_DAILY_GENERATION_LIMIT?: string;
};

export type AppBindings = Env & SecretBindings & AiBindings;

export type AuthenticatedVariables = {
  requestId: string;
  userId: string;
  athleteProfileId: string;
  sessionId: string;
  profileSex: "male" | "female";
};

export type AppEnvironment = {
  Bindings: AppBindings;
  Variables: AuthenticatedVariables;
};
