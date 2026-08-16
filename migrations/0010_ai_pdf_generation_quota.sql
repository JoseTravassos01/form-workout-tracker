ALTER TABLE ai_workout_generations
  ADD COLUMN generation_mode TEXT NOT NULL DEFAULT 'text'
  CHECK (generation_mode IN ('text','pdf'));

ALTER TABLE ai_workout_generations
  ADD COLUMN quota_cost INTEGER NOT NULL DEFAULT 1
  CHECK (quota_cost IN (1,5));

ALTER TABLE ai_workout_generations
  ADD COLUMN document_count INTEGER NOT NULL DEFAULT 0
  CHECK (document_count BETWEEN 0 AND 3);

ALTER TABLE ai_workout_generations
  ADD COLUMN document_text_length INTEGER NOT NULL DEFAULT 0
  CHECK (document_text_length BETWEEN 0 AND 60000);

CREATE INDEX ai_workout_generations_profile_mode_created_idx
  ON ai_workout_generations(athlete_profile_id, generation_mode, created_at);
