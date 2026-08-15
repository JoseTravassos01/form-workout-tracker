CREATE TABLE personal_cardio_plans (
  id TEXT PRIMARY KEY,
  athlete_profile_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  weekdays TEXT NOT NULL,
  modality TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  duration_max INTEGER NOT NULL,
  rpe_min INTEGER NOT NULL,
  rpe_max INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  recurrence_scope TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_date >= start_date),
  CHECK (duration_min BETWEEN 1 AND 600 AND duration_max BETWEEN duration_min AND 600),
  CHECK (rpe_min BETWEEN 0 AND 10 AND rpe_max BETWEEN rpe_min AND 10),
  CHECK (recurrence_scope IN ('once','week','month')),
  CHECK (active IN (0,1))
);

CREATE INDEX personal_cardio_plans_profile_period_idx
  ON personal_cardio_plans(athlete_profile_id, start_date, end_date, active);

ALTER TABLE cardio_sessions
  ADD COLUMN personal_cardio_plan_id TEXT REFERENCES personal_cardio_plans(id);

CREATE UNIQUE INDEX cardio_sessions_personal_date_uq
  ON cardio_sessions(athlete_profile_id, personal_cardio_plan_id, scheduled_date)
  WHERE personal_cardio_plan_id IS NOT NULL;

CREATE TABLE custom_program_periods (
  id TEXT PRIMARY KEY,
  athlete_profile_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id, athlete_profile_id) REFERENCES training_programs(id, athlete_profile_id),
  CHECK (end_date >= start_date),
  CHECK (active IN (0,1))
);

CREATE UNIQUE INDEX custom_program_periods_program_uq
  ON custom_program_periods(athlete_profile_id, program_id);

CREATE INDEX custom_program_periods_profile_period_idx
  ON custom_program_periods(athlete_profile_id, start_date, end_date, active);

CREATE TABLE hydration_settings (
  athlete_profile_id TEXT PRIMARY KEY REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  daily_goal_ml INTEGER NOT NULL DEFAULT 2000,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT NOT NULL DEFAULT '15:00',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (daily_goal_ml BETWEEN 250 AND 10000),
  CHECK (reminder_enabled IN (0,1)),
  CHECK (reminder_time GLOB '[0-2][0-9]:[0-5][0-9]')
);

CREATE TABLE hydration_logs (
  id TEXT PRIMARY KEY,
  athlete_profile_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  amount_ml INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount_ml BETWEEN 1 AND 5000)
);

CREATE INDEX hydration_logs_profile_date_idx
  ON hydration_logs(athlete_profile_id, local_date, logged_at);
