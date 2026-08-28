-- Rally — synthetic seed data
-- Run AFTER schema.sql and embed_taxonomy.py have both succeeded.
-- Safe to re-run: truncates live_intents / app_events / hex_activity_agg first,
-- so you can tune weights below and re-seed as many times as you want.
-- Does NOT touch activity_taxonomy_src / activity_dict.

TRUNCATE TABLE live_intents;
TRUNCATE TABLE app_events;
TRUNCATE TABLE hex_activity_agg;

-- ============================================================
-- 0. Staging tables (Memory engine — scratch space, not part of the app schema)
-- ============================================================
DROP TABLE IF EXISTS family_activity_pool;
CREATE TABLE family_activity_pool ENGINE = Memory AS
SELECT
    family_key,
    groupArray(activity_key) AS activities,
    groupArray(embedding)    AS embeddings,
    length(groupArray(activity_key)) AS family_size
FROM activity_taxonomy_src
GROUP BY family_key;

DROP TABLE IF EXISTS _cluster_arrays;
CREATE TABLE _cluster_arrays ENGINE = Memory AS
SELECT
    groupArray(name) AS names,
    groupArray(lat)  AS lats,
    groupArray(lon)  AS lons,
    groupArray(role) AS roles,
    length(groupArray(name)) AS n
FROM (
    -- role: matched_heavy | mixed | gap | campus
    SELECT 'mission'        AS name, 37.7599 AS lat, -122.4148 AS lon, 'matched_heavy' AS role
    UNION ALL SELECT 'soma',           37.7785, -122.4056, 'matched_heavy'
    UNION ALL SELECT 'marina',         37.8021, -122.4382, 'matched_heavy'
    UNION ALL SELECT 'hayes_valley',   37.7765, -122.4241, 'matched_heavy'
    UNION ALL SELECT 'north_beach',    37.8000, -122.4100, 'mixed'
    UNION ALL SELECT 'inner_sunset',   37.7601, -122.4685, 'mixed'
    UNION ALL SELECT 'inner_richmond', 37.7802, -122.4644, 'mixed'
    UNION ALL SELECT 'chinatown',      37.7941, -122.4078, 'gap'
    UNION ALL SELECT 'tenderloin',     37.7840, -122.4144, 'gap'
    UNION ALL SELECT 'bayview',        37.7299, -122.3900, 'gap'
    UNION ALL SELECT 'excelsior',      37.7244, -122.4300, 'gap'
    UNION ALL SELECT 'sf_state',       37.7241, -122.4799, 'campus'
);

-- ============================================================
-- 1. Live intents — 1,800 rows, "posted" in the last 6 hours.
--    These are the rows the money query searches. Only ONE app_event
--    (intent_posted) each — they're still open, no outcome yet.
-- ============================================================
DROP TABLE IF EXISTS _stage_live;
CREATE TABLE _stage_live ENGINE = Memory AS
WITH s1 AS (
    SELECT
        number                                   AS rn,
        generateUUIDv4()                         AS intent_id,
        generateUUIDv4()                         AS user_id,
        (rand(1) % ca.n) + 1                     AS cluster_idx,
        ca.names[cluster_idx]                    AS cluster_name,
        ca.lats[cluster_idx]                     AS cluster_lat,
        ca.lons[cluster_idx]                     AS cluster_lon,
        ca.roles[cluster_idx]                    AS role,
        700.0 / 111320.0                         AS sigma_lat_deg,
        700.0 / (111320.0 * cos(radians(cluster_lat))) AS sigma_lon_deg,
        cluster_lat + ((rand64(10) % 200001) / 100000.0 - 1.0) * (3 * sigma_lat_deg) AS lat,
        cluster_lon + ((rand64(11) % 200001) / 100000.0 - 1.0) * (3 * sigma_lon_deg) AS lon,
        rand(2) % 100                            AS fun_roll,
        multiIf(
            role = 'matched_heavy', multiIf(fun_roll < 90, 'FUN', fun_roll < 95, 'care_help', fun_roll < 98, 'campus_need', 'senior_social'),
            role = 'mixed',         multiIf(fun_roll < 65, 'FUN', fun_roll < 80, 'care_help', fun_roll < 85, 'campus_need', 'senior_social'),
            role = 'gap',           multiIf(fun_roll < 20, 'FUN', fun_roll < 55, 'care_help', fun_roll < 60, 'campus_need', 'senior_social'),
            /* campus */            multiIf(fun_roll < 25, 'FUN', fun_roll < 30, 'care_help', fun_roll < 95, 'campus_need', 'senior_social')
        ) AS family_bucket,
        ['racquet_sports','team_sports','endurance','tabletop_games','food_social'][(rand(3) % 5) + 1] AS fun_family,
        if(family_bucket = 'FUN', fun_family, family_bucket) AS family_key,
        now() - toIntervalMinute(rand(4) % 360)  AS created_at,
        rand(5) % 100                            AS gender_roll,
        multiIf(gender_roll < 45, 'female', gender_roll < 90, 'male', 'nonbinary') AS gender,
        multiIf(family_key = 'senior_social', if(rand(6) % 100 < 80, '65+', '55-64'),
                family_key = 'campus_need',    if(rand(6) % 100 < 80, '18-24', '25-34'),
                (['18-24','25-34','35-44','45-54','55-64','65+'])[(rand(6) % 6) + 1]
        ) AS age_band,
        (rand(7) % 100) AS lang_roll,
        multiIf(cluster_name = 'chinatown' AND lang_roll < 70, ['zh','en'],
                lang_roll < 60, ['en'],
                lang_roll < 75, ['en','es'],
                lang_roll < 85, ['en','zh'],
                lang_roll < 93, ['en','tl'],
                ['en','vi']
        ) AS languages,
        emptyArrayString()                       AS pref_gender,
        emptyArrayString()                       AS pref_age_bands,
        toUInt32(800 + rand(8) % 4200)            AS pref_max_distance_m,
        round(2.5 + (rand(9) % 250) / 100.0, 2)   AS trust_score,
        toUInt8(if(cluster_name = 'sf_state', 1, if(rand(12) % 100 < 15, 1, 0))) AS verified_org,
        cluster_name                              AS org_id
    FROM numbers(1800) n
    CROSS JOIN _cluster_arrays ca
)
SELECT
    s1.intent_id, s1.user_id, s1.family_key,
    fap.family_size, fap.activities, fap.embeddings,
    (rand(13) % fap.family_size) + 1 AS activity_idx,
    fap.activities[activity_idx]  AS activity_key,
    fap.embeddings[activity_idx]  AS embedding,
    s1.lat, s1.lon, s1.created_at, s1.gender, s1.age_band, s1.languages,
    s1.pref_gender, s1.pref_age_bands, s1.pref_max_distance_m, s1.trust_score,
    s1.verified_org, s1.org_id
FROM s1
INNER JOIN family_activity_pool fap ON fap.family_key = s1.family_key;

INSERT INTO live_intents
    (intent_id, user_id, activity_key, family_key, raw_text, lat, lon,
     window_start, window_end, embedding, gender, age_band, languages,
     pref_gender, pref_age_bands, pref_max_distance_m, trust_score,
     verified_org, org_id, created_at)
SELECT
    intent_id, user_id, activity_key, family_key,
    activity_key AS raw_text,   -- fine for seed data; real posts carry free text
    lat, lon,
    created_at AS window_start,
    created_at + toIntervalMinute(30 + rand(14) % 150) AS window_end,
    embedding, gender, age_band, languages, pref_gender, pref_age_bands,
    pref_max_distance_m, trust_score, verified_org, org_id, created_at
FROM _stage_live;

INSERT INTO app_events (ts, event_type, user_id, intent_id, activity_key, family_key, lat, lon, org_id)
SELECT created_at, 'intent_posted', user_id, intent_id, activity_key, family_key, lat, lon, org_id
FROM _stage_live;

-- ============================================================
-- 2. Historical intents — ~14,000, over the last 14 days.
--    Not stored in live_intents (they're closed). Each produces exactly
--    2 app_events: intent_posted + an outcome. The outcome PROBABILITY
--    is what creates the loneliness-gap signal: gap neighborhoods'
--    senior/care requests resolve far less often than fun requests
--    in the matched-heavy neighborhoods.
-- ============================================================
DROP TABLE IF EXISTS _stage_hist;
CREATE TABLE _stage_hist ENGINE = Memory AS
WITH s1 AS (
    SELECT
        number                                   AS rn,
        generateUUIDv4()                         AS intent_id,
        generateUUIDv4()                         AS user_id,
        (rand(20) % ca.n) + 1                    AS cluster_idx,
        ca.names[cluster_idx]                    AS cluster_name,
        ca.lats[cluster_idx]                     AS cluster_lat,
        ca.lons[cluster_idx]                     AS cluster_lon,
        ca.roles[cluster_idx]                    AS role,
        700.0 / 111320.0                         AS sigma_lat_deg,
        700.0 / (111320.0 * cos(radians(cluster_lat))) AS sigma_lon_deg,
        cluster_lat + ((rand64(21) % 200001) / 100000.0 - 1.0) * (3 * sigma_lat_deg) AS lat,
        cluster_lon + ((rand64(22) % 200001) / 100000.0 - 1.0) * (3 * sigma_lon_deg) AS lon,
        rand(23) % 100                           AS fun_roll,
        multiIf(
            role = 'matched_heavy', multiIf(fun_roll < 90, 'FUN', fun_roll < 95, 'care_help', fun_roll < 98, 'campus_need', 'senior_social'),
            role = 'mixed',         multiIf(fun_roll < 65, 'FUN', fun_roll < 80, 'care_help', fun_roll < 85, 'campus_need', 'senior_social'),
            role = 'gap',           multiIf(fun_roll < 20, 'FUN', fun_roll < 55, 'care_help', fun_roll < 60, 'campus_need', 'senior_social'),
            /* campus */            multiIf(fun_roll < 25, 'FUN', fun_roll < 30, 'care_help', fun_roll < 95, 'campus_need', 'senior_social')
        ) AS family_bucket,
        ['racquet_sports','team_sports','endurance','tabletop_games','food_social'][(rand(24) % 5) + 1] AS fun_family,
        if(family_bucket = 'FUN', fun_family, family_bucket) AS family_key,
        now() - toIntervalMinute(rand64(25) % 20160) AS posted_ts,   -- last 14 days
        toUInt32(5 + rand(26) % 175)              AS outcome_delay_min,
        -- THE key skew: match probability by role x family
        multiIf(
            role = 'gap'           AND family_key IN ('senior_social','care_help'), 15,
            role = 'gap',                                                            55,
            role = 'matched_heavy',                                                  85,
            role = 'campus',                                                         60,
            /* mixed */                                                              50
        ) AS match_pct,
        if(rand(27) % 100 < match_pct, 'match_confirmed', 'intent_expired_unmatched') AS outcome_type,
        cluster_name                              AS org_id
    FROM numbers(14000) n
    CROSS JOIN _cluster_arrays ca
)
SELECT
    s1.intent_id, s1.user_id, s1.family_key,
    fap.family_size, fap.activities,
    (rand(28) % fap.family_size) + 1 AS activity_idx,
    fap.activities[activity_idx]  AS activity_key,
    s1.lat, s1.lon, s1.posted_ts, s1.outcome_delay_min, s1.outcome_type, s1.org_id
FROM s1
INNER JOIN family_activity_pool fap ON fap.family_key = s1.family_key;

INSERT INTO app_events (ts, event_type, user_id, intent_id, activity_key, family_key, lat, lon, org_id)
SELECT posted_ts, 'intent_posted', user_id, intent_id, activity_key, family_key, lat, lon, org_id
FROM _stage_hist;

INSERT INTO app_events (ts, event_type, user_id, intent_id, activity_key, family_key, lat, lon, org_id)
SELECT posted_ts + toIntervalMinute(outcome_delay_min), outcome_type, user_id, intent_id, activity_key, family_key, lat, lon, org_id
FROM _stage_hist;

-- ============================================================
-- 3. Pinned demo user + hand-guaranteed nearby matches.
--    Do NOT rely on random generation for the demo's top-10 — these
--    rows are placed deliberately so the match list always tells the
--    right story regardless of how the random seed data landed.
--    Demo user sits in Mission (matched_heavy), posts "pickleball",
--    languages = ['en','es'].
-- ============================================================
-- 3a. THE DEMO USER (intent_id = ...0002; user_id matches backend's npm run seed:demo Postgres user)
INSERT INTO live_intents
    (intent_id, user_id, activity_key, family_key, raw_text, lat, lon,
     window_start, window_end, embedding, gender, age_band, languages,
     pref_gender, pref_age_bands, pref_max_distance_m, trust_score,
     verified_org, org_id, created_at)
VALUES (
    '00000000-0000-4000-8000-000000000002',
    'ddeb301a-f161-4c74-9fab-4fbfd4f54cc8',
    'pickleball', 'racquet_sports', 'anyone want to play pickleball near the Mission right now?',
    37.7599, -122.4148,
    now(), now() + INTERVAL 3 HOUR,
    (SELECT embedding FROM activity_taxonomy_src WHERE activity_key = 'pickleball' LIMIT 1),
    'female', '25-34', ['en','es'],
    [], [], 3000, 4.5, 1, 'mission', now()
);

-- 3b. Guaranteed adjacent-activity match: tennis, ~400m away
INSERT INTO live_intents
    (intent_id, user_id, activity_key, family_key, raw_text, lat, lon,
     window_start, window_end, embedding, gender, age_band, languages,
     pref_gender, pref_age_bands, pref_max_distance_m, trust_score,
     verified_org, org_id, created_at)
VALUES (
    '00000000-0000-4000-8000-000000000003', generateUUIDv4(),
    'tennis', 'racquet_sports', 'looking for a tennis partner this afternoon',
    37.7625, -122.4148,
    now(), now() + INTERVAL 3 HOUR,
    (SELECT embedding FROM activity_taxonomy_src WHERE activity_key = 'tennis' LIMIT 1),
    'male', '25-34', ['en'],
    [], [], 5000, 4.0, 0, 'mission', now()
);

-- 3c. Guaranteed shared-second-language match: coffee, overlaps on 'es'
INSERT INTO live_intents
    (intent_id, user_id, activity_key, family_key, raw_text, lat, lon,
     window_start, window_end, embedding, gender, age_band, languages,
     pref_gender, pref_age_bands, pref_max_distance_m, trust_score,
     verified_org, org_id, created_at)
VALUES (
    '00000000-0000-4000-8000-000000000004', generateUUIDv4(),
    'coffee_meetup', 'food_social', 'cafecito? free this hour',
    37.7615, -122.4160,
    now(), now() + INTERVAL 3 HOUR,
    (SELECT embedding FROM activity_taxonomy_src WHERE activity_key = 'coffee_meetup' LIMIT 1),
    'female', '35-44', ['es','pt'],
    [], [], 5000, 4.3, 0, 'mission', now()
);

-- 3d. Guaranteed senior match: companionship visit, overlaps on 'en', tags 'zh' for the pitch line
INSERT INTO live_intents
    (intent_id, user_id, activity_key, family_key, raw_text, lat, lon,
     window_start, window_end, embedding, gender, age_band, languages,
     pref_gender, pref_age_bands, pref_max_distance_m, trust_score,
     verified_org, org_id, created_at)
VALUES (
    '00000000-0000-4000-8000-000000000005', generateUUIDv4(),
    'companionship_visit', 'senior_social', 'would love company for tea this afternoon',
    37.7605, -122.4130,
    now(), now() + INTERVAL 3 HOUR,
    (SELECT embedding FROM activity_taxonomy_src WHERE activity_key = 'companionship_visit' LIMIT 1),
    'female', '65+', ['en','zh'],
    [], [], 5000, 4.8, 1, 'mission', now()
);

INSERT INTO app_events (ts, event_type, user_id, intent_id, activity_key, family_key, lat, lon, org_id)
SELECT created_at, 'intent_posted', user_id, intent_id, activity_key, family_key, lat, lon, org_id
FROM live_intents
WHERE intent_id IN (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005'
);

-- ============================================================
-- Cleanup staging tables
-- ============================================================
DROP TABLE IF EXISTS _stage_live;
DROP TABLE IF EXISTS _stage_hist;
DROP TABLE IF EXISTS _cluster_arrays;
-- family_activity_pool left in place; harmless, and reused on re-run (dropped/recreated at top)
