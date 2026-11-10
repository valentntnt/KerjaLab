CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  google_sub          TEXT UNIQUE NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  avatar_url          TEXT,
  coins               INTEGER NOT NULL DEFAULT 0,
  streak              INTEGER NOT NULL DEFAULT 0,
  last_daily_date     DATE,
  linkedin_url        TEXT,
  github_url          TEXT,
  share_with_companies BOOLEAN NOT NULL DEFAULT FALSE,
  theme               TEXT NOT NULL DEFAULT 'default',
  owned_themes        TEXT[] NOT NULL DEFAULT ARRAY['default'],
  consent_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fields (
  slug  TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  icon  TEXT NOT NULL,
  blurb TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS simulations (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  field_slug    TEXT NOT NULL REFERENCES fields(slug),
  title         TEXT NOT NULL,
  scenario      TEXT NOT NULL,
  skill         TEXT NOT NULL,
  skill_kind    TEXT NOT NULL CHECK (skill_kind IN ('hard','soft')),
  difficulty    SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  time_limit_s  INTEGER NOT NULL,
  reward_coins  INTEGER NOT NULL,
  reward_xp     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id            SERIAL PRIMARY KEY,
  simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  position      SMALLINT NOT NULL,
  prompt        TEXT NOT NULL,
  options       JSONB NOT NULL,
  answer_index  SMALLINT NOT NULL,
  explanation   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at  TIMESTAMPTZ,
  score         SMALLINT,
  passed        BOOLEAN,
  timed_out     BOOLEAN NOT NULL DEFAULT FALSE,
  duration_s    INTEGER
);
CREATE INDEX IF NOT EXISTS attempts_user_idx ON attempts(user_id, simulation_id);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill      TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('hard','soft')),
  xp         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, skill)
);
