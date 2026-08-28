# Rally backend

Standalone TypeScript API for the real Postgres + ClickHouse Rally data path. It does not contain mock responses or a degraded in-memory mode.

## Ownership boundary

- Backend owns `backend/**`, the Postgres schema, API validation, dual-write orchestration, and database clients.
- The data engineer owns ClickHouse DDL, seed data, taxonomy embeddings, and tuning the query weights in `src/queries/matches.ts`.
- The frontend calls this service through `NEXT_PUBLIC_API_BASE_URL`; it does not import backend modules.

## Run

1. Copy `.env.example` to `.env` and fill in the direct Managed Postgres endpoint plus ClickHouse credentials. Do not commit `.env`. TLS certificate verification is on by default; prefer adding the provider CA to Node over changing `PGSSL_REJECT_UNAUTHORIZED`.
2. Apply the Postgres schema: `npm run migrate`.
3. Start the API: `npm run dev`.
4. Verify both live dependencies and required ClickHouse tables: `curl http://localhost:4000/health`.

The ClickHouse data engineer must apply the project DDL before intent or map endpoints can succeed. A free-text intent also requires `OPENAI_API_KEY`. If the frontend sends a canonical `activity_key`, the API uses the real precomputed taxonomy vector and does not call the embedding provider.

At the time of backend setup, the ClickHouse service contained only the `default` user database. `backend/.env` therefore targets `default`. If the data engineer creates a dedicated database, update `CLICKHOUSE_DATABASE` to its exact name before starting the API.

## ClickPipes CDC checkpoint

In ClickHouse Cloud, configure **Replicate data in ClickHouse** from the Managed Postgres service and select `users`, `profiles`, `intents`, `matches`, and `ratings`. Once the initial snapshot has produced `pg_*` tables, apply `db/clickhouse/cdc_views.sql`. Those views always use `FINAL` and filter tombstones, so analytics never read duplicate CDC versions.

ClickPipes setup and hosted MCP OAuth are Cloud-console operations and cannot be completed by this API process. The 1:00 checkpoint remains: insert a rating in Postgres, confirm it reaches `pg_ratings`, and confirm `ratings_current` returns it. If CDC misses that checkpoint, keep the live intent dual-write and do not disguise the replication failure with backend mock data.

The idempotent integration seed is `npm run seed:demo`. Its primary user UUID is `ddeb301a-f161-4c74-9fab-4fbfd4f54cc8`; the ClickHouse data engineer must reuse that UUID for the pinned demo identity. After ClickPipes has created all five `pg_*` tables, run:

```bash
npm run cdc:apply-views
npm run cdc:test-rating
npm run cdc:verify-rating
```

The verifier polls the real `ratings_current` view for up to 60 seconds and fails rather than manufacturing a successful result.

## HTTP contract

### `POST /api/intents`

```json
{
  "intent_id": "optional-client-generated-uuid-for-idempotent-retry",
  "user_id": "existing-postgres-user-uuid",
  "raw_text": "Pickleball near the Mission in the next hour",
  "activity_key": "optional-canonical-taxonomy-key",
  "lat": 37.7599,
  "lon": -122.4148,
  "window_start": "2026-08-28T21:00:00Z",
  "window_end": "2026-08-28T22:00:00Z"
}
```

The API opens a Postgres transaction, snapshots the real profile, resolves a real taxonomy embedding, synchronously inserts into ClickHouse `live_intents` and `app_events`, then commits Postgres. A ClickHouse failure rolls back the Postgres write and returns `503`.

### `GET /api/matches?intent_id=<uuid>&limit=10`

Returns ranked matches, human-readable explanation fields, score components, and `meta.elapsed_ms`. It reads only ClickHouse `live_intents` and enforces all bidirectional filters in SQL.

### `GET /api/hex?metric=unmatched&hours=24&family_key=senior_social`

`metric` is `posted`, `matched`, or `unmatched`. Each row includes a lowercase H3 string safe for deck.gl; the API never converts a `UInt64` H3 index through JavaScript `Number`.

### `GET /health`

Returns `200` only when both Postgres and ClickHouse respond; otherwise returns `503` with per-dependency status.

## LibreChat MCP

`infra/librechat/librechat.yaml` configures the hosted ClickHouse Cloud MCP as OAuth-authenticated Streamable HTTP. Mount it into an existing LibreChat deployment and restart LibreChat. The hosted MCP is read-only by design; enable it for the ClickHouse service in the Cloud console before authenticating.
