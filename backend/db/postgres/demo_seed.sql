-- Idempotent integration seed for the real Managed Postgres service.
-- The primary user UUID is the contract with the ClickHouse data seed.

INSERT INTO users (id, handle, display_name, email)
VALUES
  ('ddeb301a-f161-4c74-9fab-4fbfd4f54cc8', 'rally-demo', 'Rally Demo', 'demo@rally.local'),
  ('2eb5a2fc-0bca-442e-9a66-dd28c69ef786', 'rally-demo-partner', 'Rally Demo Partner', 'demo-partner@rally.local')
ON CONFLICT (id) DO UPDATE SET
  handle = EXCLUDED.handle,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email;

INSERT INTO profiles (
  user_id, age_band, gender, languages, bio, pref_gender, pref_age_bands,
  pref_max_distance_m, verified_student, verified_org, background_checked, trust_score
)
VALUES
  (
    'ddeb301a-f161-4c74-9fab-4fbfd4f54cc8', '25-34', 'nonbinary', ARRAY['en', 'zh'],
    'Hackathon demo profile near the Mission.', ARRAY[]::text[], ARRAY[]::text[],
    5000, false, false, false, 4.25
  ),
  (
    '2eb5a2fc-0bca-442e-9a66-dd28c69ef786', '25-34', 'woman', ARRAY['en', 'zh'],
    'Hackathon CDC verification partner.', ARRAY[]::text[], ARRAY[]::text[],
    5000, false, false, false, 4.50
  )
ON CONFLICT (user_id) DO UPDATE SET
  age_band = EXCLUDED.age_band,
  gender = EXCLUDED.gender,
  languages = EXCLUDED.languages,
  bio = EXCLUDED.bio,
  pref_gender = EXCLUDED.pref_gender,
  pref_age_bands = EXCLUDED.pref_age_bands,
  pref_max_distance_m = EXCLUDED.pref_max_distance_m,
  trust_score = EXCLUDED.trust_score,
  updated_at = now();

INSERT INTO intents (
  id, user_id, raw_text, activity_key, family_key, lat, lon,
  window_start, window_end, status
)
VALUES
  (
    '1699f72c-494a-41a2-82c4-a6cd8475f485',
    'ddeb301a-f161-4c74-9fab-4fbfd4f54cc8',
    'Play pickleball near the Mission', 'pickleball', 'racquet',
    37.7599, -122.4148, now(), now() + interval '2 hours', 'matched'
  ),
  (
    'ec48a1b2-39c1-4686-81f8-29317771a5e2',
    '2eb5a2fc-0bca-442e-9a66-dd28c69ef786',
    'Play tennis near the Mission', 'tennis', 'racquet',
    37.7610, -122.4125, now(), now() + interval '2 hours', 'matched'
  )
ON CONFLICT (id) DO UPDATE SET
  window_start = EXCLUDED.window_start,
  window_end = EXCLUDED.window_end,
  status = EXCLUDED.status;

INSERT INTO matches (id, intent_a, intent_b, score, reason, state)
VALUES (
  '0130ac88-2f4b-42eb-9c70-6428ef05134a',
  '1699f72c-494a-41a2-82c4-a6cd8475f485',
  'ec48a1b2-39c1-4686-81f8-29317771a5e2',
  0.91,
  '{"purpose":"clickpipes_cdc_verification","adjacency":"pickleball -> racquet -> tennis"}'::jsonb,
  'accepted'
)
ON CONFLICT (id) DO UPDATE SET
  score = EXCLUDED.score,
  reason = EXCLUDED.reason,
  state = EXCLUDED.state;

