-- Rally — ClickHouse schema
-- Run against the ClickHouse Cloud instance (the OLAP / matching engine).
-- Order matters: taxonomy table before dictionary, live_intents before nothing else depends on it.

-- ============================================================
-- 1. Hot lane: live intents (direct-inserted by the app, never via CDC)
-- ============================================================
CREATE TABLE live_intents
(
    intent_id           UUID,
    user_id             UUID,
    activity_key        LowCardinality(String),
    family_key          LowCardinality(String),
    raw_text            String,
    lat                 Float64,
    lon                 Float64,
    h3_8                UInt64 MATERIALIZED geoToH3(lat, lon, 8),   -- LAT FIRST — verify with the round-trip check
    window_start        DateTime,
    window_end          DateTime,
    embedding           Array(Float32),
    -- profile snapshot denormalized onto the intent: removes every join from the hot path.
    -- Deliberate OLAP design call — worth saying out loud in the demo.
    gender              LowCardinality(String),
    age_band            LowCardinality(String),
    languages           Array(LowCardinality(String)),
    pref_gender         Array(LowCardinality(String)),
    pref_age_bands      Array(LowCardinality(String)),
    pref_max_distance_m UInt32,
    trust_score         Float32,
    verified_org        UInt8,
    org_id              LowCardinality(String),
    created_at          DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY (h3_8, activity_key, created_at)
TTL created_at + INTERVAL 3 DAY;   -- say "6 HOUR in production" during the demo; 3 DAY so seed survives the day

-- ============================================================
-- 2. Raw event stream (posts, matches, expirations) — feeds the heatmap MV
-- ============================================================
CREATE TABLE app_events
(
    ts           DateTime DEFAULT now(),
    event_type   LowCardinality(String),  -- intent_posted | match_confirmed | intent_expired_unmatched
    user_id      UUID,
    intent_id    UUID,
    activity_key LowCardinality(String),
    family_key   LowCardinality(String),
    lat          Float64,
    lon          Float64,
    h3_8         UInt64 MATERIALIZED geoToH3(lat, lon, 8),
    org_id       LowCardinality(String)
)
ENGINE = MergeTree
ORDER BY (event_type, h3_8, ts);

-- ============================================================
-- 3. Aggregated hex activity (the heatmap + the loneliness-gap map)
-- ============================================================
CREATE TABLE hex_activity_agg
(
    bucket     DateTime,
    h3_8       UInt64,
    family_key LowCardinality(String),
    posted     AggregateFunction(sum, UInt64),
    matched    AggregateFunction(sum, UInt64),
    unmatched  AggregateFunction(sum, UInt64),
    users      AggregateFunction(uniq, UUID)
)
ENGINE = AggregatingMergeTree
ORDER BY (h3_8, family_key, bucket);

CREATE MATERIALIZED VIEW mv_hex_activity TO hex_activity_agg AS
SELECT
    toStartOfFifteenMinutes(ts)                                 AS bucket,
    h3_8,
    family_key,
    sumState(toUInt64(event_type = 'intent_posted'))            AS posted,
    sumState(toUInt64(event_type = 'match_confirmed'))          AS matched,
    sumState(toUInt64(event_type = 'intent_expired_unmatched')) AS unmatched,
    uniqState(user_id)                                          AS users
FROM app_events
GROUP BY bucket, h3_8, family_key;

-- ============================================================
-- 4. Activity taxonomy — makes adjacency explainable
--    (pickleball -> racquet sports -> tennis)
-- ============================================================
CREATE TABLE activity_taxonomy_src
(
    activity_key String,
    family_key   String,
    display_name String,
    parent_path  String,
    embedding    Array(Float32)
)
ENGINE = MergeTree
ORDER BY activity_key;

CREATE DICTIONARY activity_dict
(
    activity_key String,
    family_key   String,
    display_name String,
    parent_path  String
)
PRIMARY KEY activity_key
SOURCE(CLICKHOUSE(
    TABLE 'activity_taxonomy_src'
    USER 'default'
    PASSWORD 'REPLACE_WITH_YOUR_PASSWORD'   -- Cloud requires explicit creds even for the default user; do NOT commit the real value
))
LAYOUT(COMPLEX_KEY_HASHED())   -- String key requires COMPLEX_KEY_HASHED, not HASHED
LIFETIME(MIN 0 MAX 300);

-- ============================================================
-- 5. CDC destination tables — created automatically by ClickPipes once
--    the backend engineer sets up "Replicate data in ClickHouse" from the
--    Managed Postgres console. Do NOT create these manually.
--    Expect: pg_users, pg_profiles, pg_intents, pg_matches, pg_ratings
--    Each will have _peerdb_version / _peerdb_is_deleted / _peerdb_synced_at.
--    Once they exist, wrap them:
--
--    CREATE VIEW profiles AS SELECT * FROM pg_profiles FINAL WHERE _peerdb_is_deleted = 0;
--    CREATE VIEW ratings  AS SELECT * FROM pg_ratings  FINAL WHERE _peerdb_is_deleted = 0;
--    (repeat for pg_users, pg_intents, pg_matches)
-- ============================================================
