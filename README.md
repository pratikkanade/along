# Along

Real-time, spontaneous meetup matching. Open the app, say what you want to do right now,
and it finds nearby people who want the same — or an adjacent — thing (pickleball → tennis),
including everyday needs (a ride to an appointment, someone to sit with, a spare charger).

Built for the ClickHouse hackathon "loneliness epidemic" track. ClickHouse is the live
**matching engine** (geo + vector + time + safety filters in one sub-second query), not just a
dashboard database. See [CONTEXT.md](CONTEXT.md) for the full product + architecture story.

> The app was renamed **Rally → Along** partway through; the GitHub repo is `along`.

## Quick start (demo)

```bash
npm run install:all        # install frontend + backend deps (first time only)
npm run dev:backend        # terminal 1 — Fastify API on :4000
npm run dev                # terminal 2 — Next.js app on :3000
```

Then open in **Chrome** (voice input needs it):

- **App** → http://localhost:3000
- **Organizer dashboard** → http://localhost:3000/organizer

Port 4000 is the backend API — the app calls it automatically; you don't open it directly.
Verify the backend is healthy with `curl http://localhost:4000/health` (expects postgres +
clickhouse `ok`).

Prereqs: Node 20+, a provisioned ClickHouse Cloud service and Managed Postgres, and the
schema/seed already applied (`backend/db/clickhouse/*.sql`, `backend/db/postgres/*.sql`,
`embed_taxonomy.py`). Fill `backend/.env` (see `backend/README.md`).

## Repo layout

```
along/
  frontend/      Next.js app: consumer flow + organizer dashboard (port 3000)
  backend/       Fastify API: dual-write, matching query, hex analytics (port 4000)
  backend/db/    ClickHouse + Postgres schema, seed, taxonomy embeddings
  backend/infra/ LibreChat (voice + ClickHouse MCP analyst)
```

Root scripts delegate into each workspace, so `npm run dev` at the repo root runs the frontend
(this is what the Browser preview / `.claude/launch.json` uses).

## Screens & routes

| Route | What it is |
|---|---|
| `/welcome` → `/login` → `/signup` → `/signup/welcome` | Sign-up flow (OTP is mocked) |
| `/onboarding/choice` → `/onboarding/voice` → `/onboarding` → `/onboarding/complete` | Voice onboarding + "here's what I heard" confirm card |
| `/` | Home — "Hi {name}", intent input + voice, suggestion pills, "Happening near you" feed |
| `/match` | **Immersive matching — wired to the real backend.** Posts the intent, shows ranked people with explanation chips |
| `/match/person` | A matched person's profile |
| `/chat` | 1:1 messaging (seeded convo, live composer) |
| `/profile` | Your profile + Organizer view / Reset demo links |
| `/organizer` | Loneliness-gap heatmap (matched/unmatched toggle) |

Flow: home → `/match` → tap a card → bottom sheet → **Start chat** (`/chat`) or **View profile**
(`/match/person`). The **Reset demo** link on `/profile` replays the whole signup flow.

## How it's wired

- Frontend reads `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`); see
  `frontend/.env.local.example`.
- Backend `CORS_ORIGINS` must include the frontend origin exactly, **no trailing slash**
  (`http://localhost:3000`).
- All backend calls go through `frontend/lib/api.ts`; responses are mapped to view types in
  `frontend/lib/adapters.ts`. `frontend/lib/matchStore.ts` hands the current match list to the
  detail screens.

**Consumer path:** intent → `POST /api/intents` (dual-writes Postgres + ClickHouse) →
`GET /api/matches` (ranked query, returns explanation fields + `elapsed_ms`). If the live write
fails, `/match` falls back to the pre-seeded demo intent so the **real** ClickHouse query still
runs; if the backend is unreachable, it shows clearly-labeled sample data.

**Organizer path:** `/organizer` calls `GET /api/hex`, which decodes each H3 cell to lat/lon
server-side (`h3ToGeo`) and drives the gap map; it re-queries every 6s.

## The pinned demo identity

`user_id = ddeb301a-f161-4c74-9fab-4fbfd4f54cc8` must exist in both Postgres (`npm run seed:demo`)
and ClickHouse `live_intents` (seed.sql §3a). Don't change it in one place only.

## Demo-day notes

- Use **Chrome** (voice = `webkitSpeechRecognition`).
- **Disable ClickHouse Cloud idling** and keep a `SELECT 1` tab warm — the first query after
  idling times out, which is the most common on-stage failure.
- Run the dev servers in your **own terminals** (not a throwaway process) so nothing dies
  mid-demo, and keep a backup screen recording.
