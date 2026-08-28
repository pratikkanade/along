# Rally

Real-time, spontaneous meetup matching. Open the app, say what you want to do right now,
and it finds nearby people who want the same — or an adjacent — thing. See [CONTEXT.md](CONTEXT.md)
for the full product and architecture story.

## Repo layout

```
rally/
  frontend/      Next.js consumer app + organizer dashboard (port 3000)
  backend/       Fastify API: dual-write, matching query, hex analytics (port 4000)
  backend/db/    ClickHouse + Postgres schema, seed, taxonomy embeddings
  backend/infra/ LibreChat (voice + ClickHouse MCP analyst)
```

## Run it end-to-end

Prereqs: Node 20+, a provisioned ClickHouse Cloud service and Managed Postgres, and the
schema/seed already applied (`backend/db/clickhouse/*.sql`, `backend/db/postgres/*.sql`,
`embed_taxonomy.py`).

```bash
# 1. Install both apps
npm run install:all

# 2. Backend — fill backend/.env (see backend/README.md), then:
npm run dev:backend        # Fastify on http://localhost:4000
# health check:
curl http://localhost:4000/health

# 3. Frontend (separate terminal)
npm run dev                # Next.js on http://localhost:3000
```

Root scripts delegate into each workspace, so `npm run dev` at the repo root runs the frontend
(this is what the Browser preview / `.claude/launch.json` uses).

### Frontend → backend wiring

- The frontend reads `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`). See
  `frontend/.env.local.example`.
- The backend's `CORS_ORIGINS` must include the frontend origin exactly, with **no trailing
  slash** (`http://localhost:3000`).
- All backend calls go through `frontend/lib/api.ts`; backend shapes are mapped to view types
  in `frontend/lib/adapters.ts`.

### Demo flow (consumer)

1. Type or speak an intent → `POST /api/intents` dual-writes to Postgres + ClickHouse.
2. `GET /api/matches` runs the ranked matching query and returns explanation fields + `elapsed_ms`.
3. If the live write fails (e.g. no Postgres profile), the UI falls back to the pre-seeded demo
   intent so the **real** ClickHouse match query still runs. If the backend is unreachable, an
   explicit "Show sample data" button loads mock data (clearly labeled).

### Demo flow (organizer)

`/organizer` calls `GET /api/hex`, decodes each H3 cell to lat/lon server-side (`h3ToGeo`), and
renders the loneliness-gap map with a matched/unmatched toggle. It re-queries every 6s.

## The pinned demo identity

`user_id = ddeb301a-f161-4c74-9fab-4fbfd4f54cc8` must exist in both Postgres (`npm run seed:demo`)
and ClickHouse `live_intents` (seed.sql §3a). Do not change it in one place only.
