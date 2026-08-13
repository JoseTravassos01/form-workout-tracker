ALTER TABLE recovery_checkins ADD COLUMN performance_drop_sessions INTEGER NOT NULL DEFAULT 0 CHECK(performance_drop_sessions BETWEEN 0 AND 20);
