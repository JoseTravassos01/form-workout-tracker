CREATE TABLE workout_exercise_customizations (
  workout_session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_prescription_id TEXT NOT NULL REFERENCES exercise_prescriptions(id),
  replacement_prescription_id TEXT REFERENCES exercise_prescriptions(id),
  set_count INTEGER NOT NULL CHECK(set_count BETWEEN 1 AND 20),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workout_session_id, exercise_prescription_id)
);

CREATE INDEX workout_exercise_customizations_replacement_idx
  ON workout_exercise_customizations(replacement_prescription_id);
