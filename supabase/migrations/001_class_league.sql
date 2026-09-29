BEGIN;

-- Private server schema: do not add it to Supabase's exposed Data API schemas.
CREATE SCHEMA IF NOT EXISTS class_league;
REVOKE ALL ON SCHEMA class_league FROM PUBLIC;

CREATE TABLE IF NOT EXISTS class_league.classrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  salt TEXT NOT NULL,
  password TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS class_league.sessions (
  token TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES class_league.classrooms(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('kiosk', 'admin')),
  expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS class_league.attempts (
  class_id TEXT PRIMARY KEY REFERENCES class_league.classrooms(id) ON DELETE CASCADE,
  count INTEGER NOT NULL CHECK (count >= 0),
  until BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON class_league.sessions(expires);

ALTER TABLE class_league.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_league.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_league.attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA class_league FROM PUBLIC;

-- Supabase installs these roles. Keep the script usable on standard PostgreSQL too.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA class_league FROM anon;
    REVOKE ALL ON ALL TABLES IN SCHEMA class_league FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA class_league FROM authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA class_league FROM authenticated;
  END IF;
END $$;

COMMIT;
