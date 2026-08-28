# Rally — real-time spontaneous meetup matching (3-hour build)

## Context

ClickHouse hackathon, San Francisco. Stack required: Postgres (OLTP) + ClickHouse (OLAP). Track: **the loneliness epidemic** — *"build for the communities trying to hold people together: senior centers, campus groups, neighborhoods."* Judged on **"Impact in our community/World, improving lives."** Side prize: most impressive use of LibreChat ($250).

**The problem.** Every existing tool requires pre-planning and self-broadcasting. Luma/Eventbrite need a week's notice. A WhatsApp group means announcing yourself to 200 people and hoping. There is nothing for *"I'm free right now, is anyone else?"*

**Rally.** You say what you want — *"anyone want to play pickleball in the Mission in the next hour?"* — and it finds nearby people wanting the same **or an adjacent** thing (pickleball → tennis → badminton). It covers needs as well as activities: "help me fix a shelf" (neighborhood), "spare tampon?" (campus), "someone to sit with me Thursday" (senior).

**Constraint: 3 hours, 2–3 people.** This document is scoped to what actually ships in 180 minutes. Everything not listed is cut.

---

## The two things that must work

1. Post an intent → **ranked matches in <1s with human-readable explanations** (distance, time overlap, adjacency path, trust). Wins the tech track.
2. The organizer map of **unmatched** demand — the "loneliness gap." Wins the impact track.

**The differentiator to say out loud:** most teams will use ClickHouse as a dashboard database. We use it as the **live matching engine** — geo + vector + time + safety filters in one sub-second SQL query.

---

## Architecture: two write lanes

The single most defensible thing you can say to a judge is *why* each lane exists. Not "we used CDC because it was on the slide" — but "the hot path can't tolerate replication lag, so it doesn't use it."

```
                        ┌─ INSERT (async_insert) ──→ ClickHouse.live_intents
POST /api/intents ──────┤                                  ↑ the matching engine, sub-second
                        └─ INSERT ──→ Managed Postgres ─────┐
                                      (source of truth)     │ ClickPipes CDC
                                                            ↓
                                       ClickHouse.pg_users / pg_profiles / pg_matches / pg_ratings
                                                            ↑ the analytics + organizer dashboard
```

- **Hot lane — direct insert.** `live_intents` is written straight to ClickHouse alongside the Postgres write. A "right now" app cannot wait seconds for replication; posting an intent must make it matchable immediately.
- **CDC lane — ClickPipes.** Profiles, matches, ratings and historical intents replicate from Managed Postgres automatically. These drive the dashboard, trust scores and the gap map, where seconds of lag are irrelevant.

**Why CDC is cheap here:** both ends are ClickHouse-managed, so the Managed Postgres sidebar → *"Replicate data in ClickHouse"* flow **auto-creates the publication and replication slot**. No egress-IP allowlisting, no `wal_level` fiddling, no pooler problem. This is the payoff for choosing Managed Postgres over Neon.

**Querying CDC tables — non-negotiable.** ClickPipes lands rows in a `ReplacingMergeTree` with `_peerdb_version` and `_peerdb_is_deleted`. Without `FINAL`, your counts will disagree with Postgres until background merges run — a classic live-demo embarrassment. Hide it behind views the moment the pipe is flowing:
```sql
CREATE VIEW profiles AS SELECT * FROM pg_profiles FINAL WHERE _peerdb_is_deleted = 0;
```

## Scope decisions (decided — do not relitigate mid-build)

| Decision | Rationale |
|---|---|
| **Managed Postgres + ClickPipes CDC — IN** | The organizers' exact stack, and one-click because ClickHouse owns both ends |
| **`live_intents` still dual-writes** | The matching demo cannot have replication lag in it |
| **`pg_clickhouse` — P2** | Nice extra beat, but C's lane is full. Only if you're ahead at 1:40. |
| **LibreChat = analyst agent + hosted ClickHouse MCP only** | ~45 min, low risk, and it's the prize shot |
| **Voice = browser `webkitSpeechRecognition`, in-app** | ~20 min, zero infra. Independent of LibreChat — one failing doesn't kill the other beat |
| **Onboarding is designed, not built** | Full flow is a slide + a confirm-card mock. Profiles come pre-seeded. Say this out loud in the demo. |
| HNSW `vector_similarity` index — **CUT** | Brute-force `cosineDistance` over ~1.8k rows is single-digit ms with zero syntax risk. Nobody can see an index. |
| Langfuse, `retention()`, custom write-MCP — **CUT** | Invisible, or meaningless over one day of synthetic data |
| `windowFunnel` — **P2** | Only if a lane frees up at 2:10 |

---

## Onboarding design (pitch material — build only the mock)

Two principles:
1. **Voice for the story, taps for the safety.** Never let speech-to-text decide a gender-comfort preference.
2. **Under 90 seconds to first value.** Ask 6 things, learn the rest from behavior.

| Step | Mode | Content |
|---|---|---|
| 0. Verify | tap | Phone OTP. Optional `.edu`/org email → **verified affiliation badge** (SF State, USF, a senior center). This is what makes campus + neighborhood trust work. |
| 1. Voice intro (~45s) | **voice** | *"What do you like doing with a free hour?"* / *"Anything you've been meaning to try?"* / *"When are you usually free?"* → LLM extracts interests, skill level, vibe, availability, languages. |
| 2. Safety & comfort (~30s) | **tap only** | Age band · gender identity · **"I'm comfortable meeting…"** (anyone / women only / men only / my age group) · meeting comfort (public places only / group only / 1:1 ok) · languages (prefilled from voice, confirm) · radius + travel mode (walk 1km / bike 3km / transit 8km / drive 15km) · accessibility needs |
| 3. Confirm card | tap | Editable chips — *"here's what I heard."* The trust moment. **This is the one screen worth mocking.** |
| 4. Emergency contact | optional | Enables "share my meetup" (Uber's share-trip pattern) |
| → Home | | One big button: **"I'm free right now."** |

**Criteria and why:**
- *Hard filters (bidirectional — a match surfaces only if A accepts B **and** B accepts A):* gender comfort, age band, language overlap, max distance
- *Ranking signals:* interests + skill level, intensity (chill vs competitive), group size, availability window
- *Comfort & access:* public-place-only, daytime-only, accessible venues, mobility needs
- *Trust — computed, never asked:* show-up rate, avg rating, cancel rate, reports, account age
- *Verification:* phone OTP, org badge, background-check flag (required for in-home help)

**Reframe voice as access, not gimmick:** *"Voice-first onboarding isn't a demo trick — it's how a 78-year-old in Chinatown who doesn't type uses this at all."*

---

## Schema

### Managed Postgres — keep it dumb. No pgvector, no PostGIS.
```sql
orgs(id, name, kind ENUM('campus','senior_center','neighborhood'), center_lat, center_lon, radius_m)
users(id UUID PK, handle UNIQUE, display_name, email, org_id, created_at)
profiles(user_id PK FK, age_band, gender, languages TEXT[], bio,
         pref_gender TEXT[], pref_age_bands TEXT[], pref_max_distance_m INT,
         verified_student BOOL, verified_org BOOL, background_checked BOOL,
         trust_score NUMERIC(3,2) DEFAULT 3.5)
intents(id UUID PK, user_id, raw_text, activity_key, family_key, lat, lon,
        window_start TIMESTAMPTZ, window_end TIMESTAMPTZ,
        status ENUM('open','matched','expired','cancelled'), created_at)
matches(id, intent_a, intent_b, score NUMERIC, reason JSONB, state, created_at)
```

### ClickHouse — `db/clickhouse/schema.sql`
```sql
CREATE TABLE live_intents (
  intent_id UUID, user_id UUID,
  activity_key LowCardinality(String), family_key LowCardinality(String), raw_text String,
  lat Float64, lon Float64,
  h3_8 UInt64 MATERIALIZED geoToH3(lat, lon, 8),   -- LAT FIRST (see gotchas)
  window_start DateTime, window_end DateTime,
  embedding Array(Float32),
  -- profile snapshot denormalized onto the intent: removes every join from the hot path.
  -- This is a deliberate OLAP design call — say it out loud.
  gender LowCardinality(String), age_band LowCardinality(String),
  languages Array(LowCardinality(String)),
  pref_gender Array(LowCardinality(String)), pref_age_bands Array(LowCardinality(String)),
  pref_max_distance_m UInt32, trust_score Float32, verified_org UInt8,
  org_id LowCardinality(String),
  created_at DateTime DEFAULT now()
) ENGINE = MergeTree
ORDER BY (h3_8, activity_key, created_at)
TTL created_at + INTERVAL 3 DAY;   -- say "6 HOUR in production"; 3 DAY so the seed survives

CREATE TABLE app_events (
  ts DateTime DEFAULT now(), event_type LowCardinality(String),
  user_id UUID, intent_id UUID,
  activity_key LowCardinality(String), family_key LowCardinality(String),
  lat Float64, lon Float64, h3_8 UInt64 MATERIALIZED geoToH3(lat, lon, 8),
  org_id LowCardinality(String)
) ENGINE = MergeTree ORDER BY (event_type, h3_8, ts);
-- event_type: intent_posted | match_confirmed | intent_expired_unmatched

CREATE TABLE hex_activity_agg (
  bucket DateTime, h3_8 UInt64, family_key LowCardinality(String),
  posted AggregateFunction(sum, UInt64),
  matched AggregateFunction(sum, UInt64),
  unmatched AggregateFunction(sum, UInt64),
  users AggregateFunction(uniq, UUID)
) ENGINE = AggregatingMergeTree ORDER BY (h3_8, family_key, bucket);

CREATE MATERIALIZED VIEW mv_hex_activity TO hex_activity_agg AS
SELECT toStartOfFifteenMinutes(ts) AS bucket, h3_8, family_key,
       sumState(toUInt64(event_type = 'intent_posted'))            AS posted,
       sumState(toUInt64(event_type = 'match_confirmed'))          AS matched,
       sumState(toUInt64(event_type = 'intent_expired_unmatched')) AS unmatched,
       uniqState(user_id)                                          AS users
FROM app_events GROUP BY bucket, h3_8, family_key;

CREATE TABLE activity_taxonomy_src (
  activity_key String, family_key String, display_name String,
  parent_path String, embedding Array(Float32)
) ENGINE = MergeTree ORDER BY activity_key;

CREATE DICTIONARY activity_dict (
  activity_key String, family_key String, display_name String, parent_path String
) PRIMARY KEY activity_key
SOURCE(CLICKHOUSE(TABLE 'activity_taxonomy_src'))
LAYOUT(COMPLEX_KEY_HASHED()) LIFETIME(MIN 0 MAX 300);  -- String key needs COMPLEX_KEY_HASHED
```

---

## The money query — `app/api/matches/route.ts`

Two round trips: point-query the "me" row, then bind its values as parameters. Do **not** build one CTE with a dozen scalar subqueries — it's a debugging swamp under time pressure, and the templated version is what you put on screen.

```sql
SELECT
  li.intent_id, li.user_id, li.activity_key, li.raw_text,
  geoDistance(li.lon, li.lat, {me_lon:Float64}, {me_lat:Float64})       AS dist_m,  -- LON FIRST
  cosineDistance(li.embedding, {me_vec:Array(Float32)})                 AS vec_dist,
  dictGet('activity_dict', 'parent_path', li.activity_key)              AS adjacency_path,
  least(li.window_end, {me_end:DateTime})
    - greatest(li.window_start, {me_start:DateTime})                    AS overlap_s,
  round( 0.40 * (1 - vec_dist)
       + 0.25 * exp(-dist_m / 1200)
       + 0.15 * least(overlap_s / 3600, 1)
       + 0.10 * (li.trust_score / 5)
       + 0.10 * (li.family_key = {me_family:String}), 4)                AS score
FROM live_intents li
WHERE li.h3_8 IN h3kRing({me_h3_8:UInt64}, 1)
  AND li.user_id != {me_user:UUID}
  AND overlap_s > 0
  AND dist_m <= least(li.pref_max_distance_m, {me_max_dist:UInt32})
  AND (empty(li.pref_gender)    OR has(li.pref_gender, {me_gender:String}))
  AND (empty({me_pref_gender:Array(String)}) OR has({me_pref_gender:Array(String)}, li.gender))
  AND (empty(li.pref_age_bands) OR has(li.pref_age_bands, {me_age:String}))
  AND (empty({me_pref_ages:Array(String)})   OR has({me_pref_ages:Array(String)}, li.age_band))
  AND notEmpty(arrayIntersect(li.languages, {me_langs:Array(String)}))
ORDER BY score DESC
LIMIT 10;
```

**Embeddings — one batch call, off the hot path.** Embed the ~50 taxonomy leaves once into `activity_taxonomy_src`; seed intents join their leaf's vector. Free-text intents make one embedding call at post time with nearest-leaf as fallback. Real `cosineDistance`, no API risk during the demo.

---

## Seed data — `db/clickhouse/seed.sql`

Uniform random data produces a gray mush map and no story. **Engineer the seed so the story is true.**

`INSERT INTO … SELECT … FROM numbers(N)` with **distinct `rand64(1)`, `rand64(2)` seeds per column** — same seed means correlated lat/lon.

- 2,000 users + profiles · 8,000 historical intents (14 days) · **1,800 live intents in the last 6 hours** (what the demo queries) · ~30,000 `app_events`

**12 San Francisco anchor clusters**, Gaussian σ ≈ 500–800m so kRing-1 at res 8 is dense:

| Cluster | lat, lon | Role in the story |
|---|---|---|
| Mission | 37.7599, −122.4148 | matched-heavy |
| SoMa | 37.7785, −122.4056 | matched-heavy |
| Marina | 37.8021, −122.4382 | matched-heavy |
| Hayes Valley | 37.7765, −122.4241 | matched-heavy |
| North Beach | 37.8000, −122.4100 | mixed |
| Inner Sunset | 37.7601, −122.4685 | mixed |
| Inner Richmond | 37.7802, −122.4644 | mixed |
| **Chinatown** | 37.7941, −122.4078 | **the gap — senior/companionship, Cantonese** |
| **Tenderloin** | 37.7840, −122.4144 | **the gap** |
| **Bayview** | 37.7299, −122.3900 | **the gap** |
| **Excelsior** | 37.7244, −122.4300 | **the gap** |
| SF State / Parkmerced | 37.7241, −122.4799 | campus micro-needs |

→ ~140 populated hexes at res 8. **Render the heatmap at res 8** (~0.92 km across).

**Taxonomy — ~50 leaves, 8 families. The mix IS the pitch:**
- racquet (pickleball, tennis, badminton, squash, table tennis), court/team, endurance, tabletop, food, study/work — **55%** (the hook)
- **care/help** (fix a shelf, jump a car, move furniture, grocery run, **ride to a medical appointment**) — **25%**
- **campus micro-need** (spare tampon, charger, umbrella, textbook loan) — **10%**
- **senior/social** (companionship visit, phone tech help, cribbage, garden club) — **10%**

**The deliberate signal:** make senior/care intents in **Chinatown, Bayview, Excelsior and the Tenderloin overwhelmingly unmatched**, and Marina/SoMa coffee meets overwhelmingly matched. *That asymmetry is the loneliness-gap visual.* Without it the map says nothing.

Languages drawn realistically for SF (en, es, **zh**, tl, ru, vi) — `arrayIntersect` is one line and lands hard: **"we match Cantonese-speaking seniors in Chinatown with each other."**

**Pin one demo user near the venue** so the map centers where the judges are sitting. Hand-verify their top-10 contains: one adjacent-activity match, one shared-second-language match, one senior.

---

## Timeline — 180 minutes

**Lanes, assigned at 0:00, never reassigned.** **A** = ClickHouse/data · **B** = Next.js full-stack · **C** = Managed Postgres + ClickPipes + LibreChat + **Demo Director** (owns the script from minute one).
*At 2 people:* C's lane is over capacity — do CDC **or** LibreChat, not both. CDC is the required stack; LibreChat is a bonus prize. Choose accordingly.

### 0:00–0:20 · Gate check — everyone, nothing else · **P0**
Every external dependency proven, not assumed.
- **Install Node 20 — it is not on this machine:** `winget install OpenJS.NodeJS.LTS`
- **Start Docker Desktop — installed, daemon not running** (LibreChat needs it)
- ClickHouse Cloud service (**fresh email** — $400 credits) → **disable idling immediately**
- **Provision Managed Postgres** (console → New service → Postgres). Grab the **direct 5432 URI**, not the pooled one.
- `git init`, push, **deploy hello-world to Vercel** — the most-skipped step that kills hackathon demos
- Shared `.env` pinned in chat. Mapbox token. Declare file ownership.

**First ClickHouse query, before any other SQL:**
```sql
SELECT version();
SELECT h3ToGeo(geoToH3(37.7599, -122.4148, 8));  -- must return ≈(37.76, -122.41)
```
If that round-trip is wrong, your H3 argument order is flipped and every user lands in the wrong hemisphere.

### 0:20–1:00 · **P0**
- **A**: all ClickHouse DDL · taxonomy rows + one batch embedding call · start the seed generator
- **B**: Next.js scaffold, `@clickhouse/client`, `lib/clickhouse.ts`. **Both screens built against hardcoded JSON** — do not wait for the API.
- **C**: Postgres schema applied + a few seed rows · **ClickPipes CDC configured** from the Managed Postgres sidebar → *Replicate data in ClickHouse* (map `users`, `profiles`, `intents`, `matches`, `ratings`) · create the `FINAL` views · `docker compose up` LibreChat in the background while the snapshot runs

**CDC checkpoint at 1:00:** insert a row in Postgres, confirm it appears in ClickHouse. If the pipe isn't flowing, take the bail-out below — do not debug it past this point.

### 1:00–1:40 · the money hour · **P0**
- **A**: the money query. **Most of this is tuning weights against the seed** until the demo user's top-10 is narratively good. Budget for that, not for typing SQL.
- **B**: `POST /api/intents` (dual-write) · `GET /api/matches` returning score breakdown + `elapsed_ms` · match cards with explanation chips
- **C**: LibreChat + hosted ClickHouse MCP (`https://mcp.clickhouse.cloud/mcp`) → one NL→SQL answer working, using a read-only ClickHouse user.

**Gate 1:40 — end-to-end post → ranked matches on screen.** If this isn't working, stop everything else and converge.

### 1:40–2:10 · **P0**
- **B**: `GET /api/hex` + deck.gl map with the **unmatched toggle** — this is the impact beat, it does not depend on the matching engine, so it can land independently
- **A**: live MV counter query. Voice input via `webkitSpeechRecognition` (~20 min).
- **C**: demo script v2, rehearse the LibreChat question until the agent answers it reliably

### 2:10 · **FEATURE FREEZE (hard)** + first ugly rehearsal
Full walkthrough, unstyled, whole team watching. Integration bugs surface here, not at 2:50.

### 2:20–3:00 · **P0**
Two stopwatch rehearsals · **record a backup video** · fix only what breaks the script · submission form + README · keepalive tab open · laptop charged, adapter tested, hotspot ready.

---

## Risks and bail-outs

| Risk | Trigger | Fallback |
|---|---|---|
| Node missing / Docker down | 0:20 | Whole team stops. Nothing else matters. |
| **Managed Postgres is beta; trial-credit eligibility unconfirmed** | **0:20 — hard bail** | Neon free tier + generic ClickPipes (slower: needs egress-IP allowlisting and the **direct 5432 URI**, never the pooled one). Do not spend 40 minutes fighting a beta provisioner. |
| **ClickPipes snapshot not flowing** | **1:00 — hard bail** | Dual-write the remaining tables from the API, exactly like `live_intents`. The dashboard doesn't care where rows came from. Say "CDC for the warm path, direct writes for the hot path" and move on — do not debug replication during a 3-hour build. |
| CDC rows visible but counts look wrong | any | You forgot `FINAL` / `_peerdb_is_deleted = 0`. Use the views. |
| **CH Cloud idles → 30s timeout on stage** | always | Disable idling at 0:00 **and** keep a `SELECT 1` keepalive running in a browser tab during the demo. Warm the exact demo query beforehand. |
| LibreChat MCP won't connect | 1:40 | Show the ClickHouse Cloud SQL console instead and narrate the query. |
| Speech recognition flaky | 2:10 | Type into the same box. Chrome only — **do not demo voice in Firefox/Safari.** |
| deck.gl H3 layer won't render | 1:55 | Mapbox circle layer sized/colored by count; worst case a static SVG hex grid. The gap map is P0 — it needs a dumb fallback. |
| Embedding API flaky | 1:00 | Precomputed taxonomy vectors (already the design). |
| TTL eats the seed mid-demo | 0:40 | `TTL … 3 DAY`. Never re-seed 5 minutes before stage. |
| Timezone display | 1:55 | Seed UTC, render `America/Los_Angeles`. A "6pm" window showing "01:00" looks broken. |

**Two gotchas that each cost an hour if unflagged:**
1. `geoToH3(lat, lon, res)` takes **lat first**; `geoDistance(lon, lat, lon, lat)` takes **lon first** and returns metres. Silent swap, catastrophic result.
2. deck.gl `H3HexagonLayer` wants a lowercase hex **string** (`'8828308281fffff'`) but `geoToH3` returns `UInt64` → return `lower(hex(h3_8))` from the API. And **UInt64 loses precision in JS**: ClickHouse quotes 64-bit ints in JSON by default — leave `output_format_json_quote_64bit_integers=1` alone and never `Number()` an h3 index.

---

## The demo (~3.5 min)

- **0:00–0:25 Hook**, first person, no slides. *"I moved to SF in September. I wanted to play pickleball on a Tuesday at 6pm. There's no app for that — Luma needs a week's notice, and a WhatsApp group means broadcasting yourself to 200 people."*
- **0:25–1:15 Consumer flow.** Speak into it. Pin drops. Ranked matches with explanation chips.
- **1:15–1:40 Adjacency beat.** *"Match #2 asked for tennis, not pickleball."* Show the chip: `pickleball → racquet sports → tennis`.
- **1:40–2:00 The SQL**, 8 seconds on screen. *"One ClickHouse query: H3 kRing prefilter, exact geoDistance, cosine similarity on intent embeddings, time overlap, bidirectional safety filters, trust. **11 milliseconds over 1,800 live intents.**"*
- **2:00–2:15 Make CDC visible** — it produces zero pixels unless you force it to. Have a `psql` window open beside the dashboard: `INSERT` a rating into Managed Postgres, refresh, watch it land in ClickHouse. *"Intents are dual-written because matching can't wait for replication. Everything else — profiles, matches, ratings — arrives by ClickPipes CDC. Postgres is the ledger, ClickHouse is the engine."* Fifteen seconds, and it's the whole PB&J thesis.
- **2:15–2:55 Organizer dashboard.** Heatmap → toggle to unmatched: *"Chinatown, weekday afternoons: 71% of requests for a companionship visit or help with a phone go unanswered — and most of them are in Cantonese. That's not a metric. That's where the senior center puts next month's volunteer program."*
- **2:55–3:25 LibreChat analyst.** Organizer asks in plain English; the agent writes SQL against ClickHouse live.
- **3:25–3:35 Close.** Impact line + the safety answer, unprompted.

**What makes judges say "genuinely impactful":**
- **Lead the impact beat with the unglamorous categories.** Pickleball is the hook; *"a ride to a dialysis appointment"* and *"someone to sit with me Thursday"* are the impact.
- **Make the map produce a decision, not a metric** — real neighborhood, real time window, real intervention.
- **Answer safety before they ask.** Someone *will* ask "so you send strangers into old people's homes?" Have it on screen: org-verified badges, background-check flag for in-home help, bidirectional preference filters as hard `WHERE` clauses, trust score in ranking, public-place default for first meets.
- **Say what's real and what's simulated, once, explicitly.** *"The 1,800 live intents are synthetic; the query, the schema and the pipeline are real."* Judges reward that and punish discovering it themselves.
- If anyone has 10 spare minutes: **call one SF senior center or campus group.** *"We spoke to the program director at [X] this morning; she said [quote]"* beats any feature you could build in that time.

Anti-patterns: opening on an architecture diagram; describing ClickHouse features you never show; ever saying *"we ran out of time to…"*.

---

## Files to create (in order)

- `db/clickhouse/schema.sql` — tables, MV, dictionary
- `db/clickhouse/seed.sql` — `numbers()` generator; the 12 SF clusters and the engineered unmatched skew live here
- `scripts/embed_taxonomy.py` — one batch embedding call → `activity_taxonomy_src`
- `lib/clickhouse.ts` — single-owner client module (`async_insert`, UInt64 handling)
- `app/api/intents/route.ts` — dual-write · `app/api/matches/route.ts` — money query + `elapsed_ms` · `app/api/hex/route.ts`
- `app/page.tsx` — "I'm free right now" + voice input + match cards
- `app/organizer/page.tsx` — deck.gl H3HexagonLayer, unmatched toggle, live MV counter

## Verification

1. `SELECT version()` + the `h3ToGeo(geoToH3(...))` round-trip — before any other SQL.
2. After seeding: `SELECT h3_8, count() FROM live_intents GROUP BY h3_8 ORDER BY 2 DESC LIMIT 20` — confirm ~140 populated hexes and that Chinatown/Bayview skew unmatched.
3. Hand-verify the pinned demo user's top-10 has an adjacent-activity match, a shared-language match, and a senior.
4. **CDC:** `INSERT` a row into Managed Postgres → confirm it appears in the ClickHouse `pg_*` table within seconds, and that the `FINAL` view count matches Postgres exactly.
5. End-to-end: post in the browser → row in Postgres **and** ClickHouse → appears in another user's matches → pin on the organizer map.
6. Stopwatch rehearsal at 2:10 and 2:35. Backup video recorded by 2:45.
