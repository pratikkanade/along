CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE org_kind AS ENUM ('campus', 'senior_center', 'neighborhood');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE intent_status AS ENUM ('open', 'matched', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE match_state AS ENUM ('suggested', 'accepted', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind org_kind NOT NULL,
  center_lat double precision NOT NULL CHECK (center_lat BETWEEN -90 AND 90),
  center_lon double precision NOT NULL CHECK (center_lon BETWEEN -180 AND 180),
  radius_m integer NOT NULL CHECK (radius_m > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text UNIQUE,
  org_id uuid REFERENCES orgs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age_band text NOT NULL,
  gender text NOT NULL,
  languages text[] NOT NULL CHECK (cardinality(languages) > 0),
  bio text NOT NULL DEFAULT '',
  pref_gender text[] NOT NULL DEFAULT '{}',
  pref_age_bands text[] NOT NULL DEFAULT '{}',
  pref_max_distance_m integer NOT NULL CHECK (pref_max_distance_m > 0),
  verified_student boolean NOT NULL DEFAULT false,
  verified_org boolean NOT NULL DEFAULT false,
  background_checked boolean NOT NULL DEFAULT false,
  trust_score numeric(3,2) NOT NULL DEFAULT 3.50 CHECK (trust_score BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text text NOT NULL CHECK (length(raw_text) BETWEEN 1 AND 1000),
  activity_key text NOT NULL,
  family_key text NOT NULL,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  status intent_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_end > window_start)
);

CREATE INDEX IF NOT EXISTS intents_open_by_user_idx
  ON intents (user_id, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS intents_created_at_idx ON intents (created_at DESC);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_a uuid NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  intent_b uuid NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  score numeric NOT NULL CHECK (score >= 0),
  reason jsonb NOT NULL DEFAULT '{}',
  state match_state NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (intent_a <> intent_b),
  UNIQUE (intent_a, intent_b)
);

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  rater_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rater_user_id <> rated_user_id),
  UNIQUE (match_id, rater_user_id)
);

COMMENT ON TABLE intents IS 'Postgres source of truth; open intents are synchronously dual-written to ClickHouse for matching.';
COMMENT ON TABLE ratings IS 'Warm-path table intended for ClickPipes CDC into ClickHouse.';

