CREATE TABLE ai_workout_generations (
  id TEXT PRIMARY KEY,
  athlete_profile_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  prompt_length INTEGER NOT NULL,
  status TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_code TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (duration_weeks IN (4,12)),
  CHECK (prompt_length BETWEEN 20 AND 3000),
  CHECK (status IN ('pending','completed','failed')),
  CHECK (input_tokens IS NULL OR input_tokens >= 0),
  CHECK (output_tokens IS NULL OR output_tokens >= 0)
);

CREATE INDEX ai_workout_generations_profile_created_idx
  ON ai_workout_generations(athlete_profile_id, created_at);
