CREATE TABLE athlete_program_assignments (
  athlete_profile_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (athlete_profile_id, program_id),
  FOREIGN KEY (program_id, athlete_profile_id) REFERENCES training_programs(id, athlete_profile_id),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX athlete_program_assignments_current_uq
  ON athlete_program_assignments(athlete_profile_id)
  WHERE effective_to IS NULL;

CREATE INDEX athlete_program_assignments_period_idx
  ON athlete_program_assignments(athlete_profile_id, effective_from, effective_to);

INSERT INTO athlete_program_assignments (athlete_profile_id, program_id, effective_from, effective_to)
SELECT id, current_program_id, program_start_date, NULL
FROM athlete_profiles
WHERE current_program_id IS NOT NULL
ON CONFLICT(athlete_profile_id, program_id) DO NOTHING;

ALTER TABLE exercise_prescriptions
  ADD COLUMN direct_glute_medius INTEGER NOT NULL DEFAULT 0
  CHECK (direct_glute_medius IN (0, 1));

ALTER TABLE workout_exercise_customizations
  ADD COLUMN replacement_exercise_id TEXT REFERENCES exercises(id);

ALTER TABLE workout_exercise_customizations
  ADD COLUMN source TEXT NOT NULL DEFAULT 'session'
  CHECK (source IN ('session', 'preference'));

UPDATE workout_exercise_customizations
SET replacement_exercise_id = (
  SELECT exercise_id
  FROM exercise_prescriptions
  WHERE id = workout_exercise_customizations.replacement_prescription_id
)
WHERE replacement_prescription_id IS NOT NULL
  AND replacement_exercise_id IS NULL;

CREATE TABLE exercise_substitution_preferences (
  athlete_profile_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  source_exercise_id TEXT NOT NULL REFERENCES exercises(id),
  replacement_exercise_id TEXT NOT NULL REFERENCES exercises(id),
  replacement_prescription_id TEXT REFERENCES exercise_prescriptions(id),
  effective_from TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (athlete_profile_id, program_id, source_exercise_id),
  FOREIGN KEY (program_id, athlete_profile_id) REFERENCES training_programs(id, athlete_profile_id),
  CHECK (source_exercise_id <> replacement_exercise_id)
);

CREATE INDEX exercise_substitution_preferences_replacement_idx
  ON exercise_substitution_preferences(replacement_exercise_id);
