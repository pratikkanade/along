-- Apply only after ClickPipes has created and snapshotted the pg_* tables.
-- ReplacingMergeTree CDC tables must be queried with FINAL and tombstones removed.

CREATE VIEW IF NOT EXISTS users_current AS
SELECT * EXCEPT (_peerdb_version, _peerdb_is_deleted)
FROM pg_users FINAL
WHERE _peerdb_is_deleted = 0;

CREATE VIEW IF NOT EXISTS profiles_current AS
SELECT * EXCEPT (_peerdb_version, _peerdb_is_deleted)
FROM pg_profiles FINAL
WHERE _peerdb_is_deleted = 0;

CREATE VIEW IF NOT EXISTS intents_history AS
SELECT * EXCEPT (_peerdb_version, _peerdb_is_deleted)
FROM pg_intents FINAL
WHERE _peerdb_is_deleted = 0;

CREATE VIEW IF NOT EXISTS matches_history AS
SELECT * EXCEPT (_peerdb_version, _peerdb_is_deleted)
FROM pg_matches FINAL
WHERE _peerdb_is_deleted = 0;

CREATE VIEW IF NOT EXISTS ratings_current AS
SELECT * EXCEPT (_peerdb_version, _peerdb_is_deleted)
FROM pg_ratings FINAL
WHERE _peerdb_is_deleted = 0;

